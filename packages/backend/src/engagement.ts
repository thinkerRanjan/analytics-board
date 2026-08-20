import type { EngagementPoint, TenantConfig } from "@analytics/shared";
import { runQuery, useMockData } from "./bigquery";
import { getMockEngagement } from "./mock-data";

type EngagementRow = {
  event_date: string;
  activeUsers: number | string;
  newUsers: number | string;
  avgSessionSeconds: number | string;
};

type EventCountRow = {
  event_date: string;
  eventName: string;
  count: number | string;
};

const num = (value: unknown): number => Number(value) || 0;

/**
 * Daily engagement series straight from the GA4 events export. There is no
 * mart for these metrics, so this always reads `events_*`.
 */
export async function fetchEngagementDaily(
  tenant: TenantConfig,
  start: string,
  end: string,
  eventNames: string[] = [],
): Promise<EngagementPoint[]> {
  if (useMockData()) {
    return getMockEngagement(tenant.id, start, end, eventNames);
  }

  const qualified = `${tenant.bigquery.projectId}.${tenant.bigquery.dataset}`;
  const startKey = start.replaceAll("-", "");
  const endKey = end.replaceAll("-", "");

  const [daily, eventCounts] = await Promise.all([
    runQuery<EngagementRow>(
      tenant,
      `
      WITH base AS (
        SELECT
          PARSE_DATE('%Y%m%d', event_date) AS date,
          user_pseudo_id,
          event_name,
          (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS session_id,
          IFNULL((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec'), 0) AS engagement_msec,
          -- session_engaged is written as a string on most events and as an
          -- int on the rest, so both spellings have to be read.
          COALESCE(
            (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'session_engaged'),
            SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'session_engaged') AS INT64),
            0
          ) AS session_engaged
        FROM \`${qualified}.events_*\`
        WHERE _TABLE_SUFFIX BETWEEN @startKey AND @endKey
      ),
      sessions AS (
        SELECT
          date,
          user_pseudo_id,
          session_id,
          SUM(engagement_msec) AS engagement_msec,
          MAX(session_engaged) AS engaged
        FROM base
        WHERE session_id IS NOT NULL
        GROUP BY date, user_pseudo_id, session_id
      ),
      session_daily AS (
        SELECT
          date,
          COUNT(DISTINCT IF(engaged > 0, user_pseudo_id, NULL)) AS active_users,
          IFNULL(SAFE_DIVIDE(SUM(engagement_msec), COUNT(*)), 0) / 1000 AS avg_session_seconds
        FROM sessions
        GROUP BY date
      ),
      event_daily AS (
        SELECT
          date,
          COUNT(DISTINCT IF(event_name = 'first_visit', user_pseudo_id, NULL)) AS new_users
        FROM base
        GROUP BY date
      )
      SELECT
        FORMAT_DATE('%Y-%m-%d', e.date) AS event_date,
        IFNULL(s.active_users, 0) AS activeUsers,
        IFNULL(e.new_users, 0) AS newUsers,
        IFNULL(s.avg_session_seconds, 0) AS avgSessionSeconds
      FROM event_daily e
      LEFT JOIN session_daily s USING (date)
      ORDER BY event_date
      `,
      { startKey, endKey },
    ),
    eventNames.length > 0
      ? runQuery<EventCountRow>(
          tenant,
          `
          SELECT
            FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) AS event_date,
            event_name AS eventName,
            COUNT(*) AS count
          FROM \`${qualified}.events_*\`
          WHERE _TABLE_SUFFIX BETWEEN @startKey AND @endKey
            AND event_name IN UNNEST(@eventNames)
          GROUP BY event_date, eventName
          ORDER BY event_date
          `,
          { startKey, endKey, eventNames },
        )
      : Promise.resolve([] as EventCountRow[]),
  ]);

  const countsByDate = new Map<string, Record<string, number>>();
  for (const row of eventCounts) {
    const bucket = countsByDate.get(row.event_date) ?? {};
    bucket[row.eventName] = num(row.count);
    countsByDate.set(row.event_date, bucket);
  }

  return daily.map((row) => {
    const counts = countsByDate.get(row.event_date) ?? {};
    // Absent event/date combinations are real zeroes, not gaps.
    const events = Object.fromEntries(
      eventNames.map((name) => [name, counts[name] ?? 0]),
    );

    return {
      date: row.event_date,
      activeUsers: num(row.activeUsers),
      newUsers: num(row.newUsers),
      avgSessionSeconds: num(row.avgSessionSeconds),
      events,
    };
  });
}
