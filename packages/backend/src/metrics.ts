import type {
  OverviewMetrics,
  PageRow,
  SourceRow,
  TenantConfig,
  TrendPoint,
} from "@analytics/shared";
import { runQuery, useMockData } from "./bigquery";
import { getMockOverview } from "./mock-data";

type DailyRow = {
  event_date: string;
  sessions: number;
  users: number;
  pageviews: number;
  conversions: number;
};

export async function fetchOverviewMetrics(
  tenant: TenantConfig,
  start: string,
  end: string,
): Promise<OverviewMetrics> {
  if (useMockData()) {
    return getMockOverview(tenant.id, start, end);
  }

  const qualified = `${tenant.bigquery.projectId}.${tenant.bigquery.dataset}`;

  try {
    return await fetchFromMarts(tenant, qualified, start, end);
  } catch {
    return await fetchFromEvents(tenant, qualified, start, end);
  }
}

async function fetchFromMarts(
  tenant: TenantConfig,
  qualified: string,
  start: string,
  end: string,
): Promise<OverviewMetrics> {
  const trend = await runQuery<DailyRow>(
    tenant,
    `
    SELECT
      FORMAT_DATE('%Y-%m-%d', date) AS event_date,
      sessions,
      users,
      pageviews,
      conversions
    FROM \`${qualified}.mart_daily_overview\`
    WHERE date BETWEEN @start AND @end
    ORDER BY date
    `,
    { start, end },
  );

  const sources = await runQuery<SourceRow>(
    tenant,
    `
    SELECT source, medium, SUM(sessions) AS sessions
    FROM \`${qualified}.mart_daily_by_source\`
    WHERE date BETWEEN @start AND @end
    GROUP BY source, medium
    ORDER BY sessions DESC
    LIMIT 10
    `,
    { start, end },
  );

  const pages = await runQuery<PageRow>(
    tenant,
    `
    SELECT page_path AS pagePath, page_title AS pageTitle, SUM(pageviews) AS pageviews
    FROM \`${qualified}.mart_daily_by_page\`
    WHERE date BETWEEN @start AND @end
    GROUP BY page_path, page_title
    ORDER BY pageviews DESC
    LIMIT 10
    `,
    { start, end },
  );

  return assemble(tenant.id, start, end, trend, sources, pages, false);
}

async function fetchFromEvents(
  tenant: TenantConfig,
  qualified: string,
  start: string,
  end: string,
): Promise<OverviewMetrics> {
  const startKey = start.replaceAll("-", "");
  const endKey = end.replaceAll("-", "");

  const trend = await runQuery<DailyRow>(
    tenant,
    `
    SELECT
      FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) AS event_date,
      COUNT(DISTINCT CONCAT(
        user_pseudo_id,
        CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
      )) AS sessions,
      COUNT(DISTINCT user_pseudo_id) AS users,
      COUNTIF(event_name = 'page_view') AS pageviews,
      COUNTIF(event_name = 'purchase' OR event_name = 'generate_lead') AS conversions
    FROM \`${qualified}.events_*\`
    WHERE _TABLE_SUFFIX BETWEEN @startKey AND @endKey
    GROUP BY event_date
    ORDER BY event_date
    `,
    { startKey, endKey },
  );

  const sources = await runQuery<SourceRow>(
    tenant,
    `
    SELECT
      IFNULL(traffic_source.source, '(direct)') AS source,
      IFNULL(traffic_source.medium, '(none)') AS medium,
      COUNT(DISTINCT CONCAT(
        user_pseudo_id,
        CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
      )) AS sessions
    FROM \`${qualified}.events_*\`
    WHERE _TABLE_SUFFIX BETWEEN @startKey AND @endKey
      AND event_name = 'session_start'
    GROUP BY source, medium
    ORDER BY sessions DESC
    LIMIT 10
    `,
    { startKey, endKey },
  );

  const pages = await runQuery<PageRow>(
    tenant,
    `
    SELECT
      IFNULL((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location'), '(not set)') AS pagePath,
      IFNULL((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_title'), '(not set)') AS pageTitle,
      COUNT(*) AS pageviews
    FROM \`${qualified}.events_*\`
    WHERE _TABLE_SUFFIX BETWEEN @startKey AND @endKey
      AND event_name = 'page_view'
    GROUP BY pagePath, pageTitle
    ORDER BY pageviews DESC
    LIMIT 10
    `,
    { startKey, endKey },
  );

  return assemble(tenant.id, start, end, trend, sources, pages, false);
}

function assemble(
  tenantId: string,
  start: string,
  end: string,
  trendRows: DailyRow[],
  sources: SourceRow[],
  pages: PageRow[],
  mock: boolean,
): OverviewMetrics {
  const trend: TrendPoint[] = trendRows.map((row) => ({
    date: row.event_date,
    sessions: Number(row.sessions) || 0,
    users: Number(row.users) || 0,
    pageviews: Number(row.pageviews) || 0,
    conversions: Number(row.conversions) || 0,
  }));

  const kpis = trend.reduce(
    (acc, row) => ({
      sessions: acc.sessions + row.sessions,
      users: acc.users + row.users,
      pageviews: acc.pageviews + row.pageviews,
      conversions: acc.conversions + row.conversions,
    }),
    { sessions: 0, users: 0, pageviews: 0, conversions: 0 },
  );

  return {
    start,
    end,
    mock,
    tenantId,
    kpis,
    trend,
    sources: sources.map((s) => ({
      source: s.source,
      medium: s.medium,
      sessions: Number(s.sessions) || 0,
    })),
    pages: pages.map((p) => ({
      pagePath: p.pagePath,
      pageTitle: p.pageTitle,
      pageviews: Number(p.pageviews) || 0,
    })),
  };
}
