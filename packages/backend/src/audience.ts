import type {
  AudienceBreakdowns,
  AudienceDimension,
  TenantConfig,
} from "@analytics/shared";
import { runQuery, useMockData } from "./bigquery";
import { getMockBreakdowns } from "./mock-data";

/** Rows kept per dimension; widgets slice this down to their own limit. */
const ROWS_PER_DIMENSION = 25;

/**
 * Column expressions in the `base` CTE below. Values are fixed here rather
 * than interpolated from caller input, so the dynamic SQL stays injection-safe.
 */
const DIMENSION_COLUMN: Record<Exclude<AudienceDimension, "userType">, string> = {
  country: "country",
  region: "region",
  city: "city",
  deviceCategory: "deviceCategory",
  operatingSystem: "operatingSystem",
  browser: "browser",
  language: "language",
};

type BreakdownQueryRow = {
  dimension: string;
  label: string | null;
  value: number | string;
};

export async function fetchAudienceBreakdowns(
  tenant: TenantConfig,
  start: string,
  end: string,
  dimensions: AudienceDimension[],
): Promise<AudienceBreakdowns> {
  if (dimensions.length === 0) return {};
  if (useMockData()) {
    return getMockBreakdowns(tenant.id, start, end, dimensions);
  }

  const qualified = `${tenant.bigquery.projectId}.${tenant.bigquery.dataset}`;
  const startKey = start.replaceAll("-", "");
  const endKey = end.replaceAll("-", "");

  const parts = dimensions.map((dimension) => {
    if (dimension === "userType") {
      // A user is "new" when their first_visit falls inside the range; everyone
      // else counted in the window is returning.
      return `
        SELECT 'userType' AS dimension, label, value FROM (
          SELECT 'New' AS label,
            COUNT(DISTINCT IF(event_name = 'first_visit', user_pseudo_id, NULL)) AS value
          FROM base
          UNION ALL
          SELECT 'Returning' AS label,
            COUNT(DISTINCT user_pseudo_id)
              - COUNT(DISTINCT IF(event_name = 'first_visit', user_pseudo_id, NULL)) AS value
          FROM base
        )`;
    }

    const column = DIMENSION_COLUMN[dimension];
    return `
      SELECT '${dimension}' AS dimension, label, value FROM (
        SELECT
          IFNULL(NULLIF(${column}, ''), '(not set)') AS label,
          COUNT(DISTINCT user_pseudo_id) AS value
        FROM base
        GROUP BY label
        ORDER BY value DESC
        LIMIT ${ROWS_PER_DIMENSION}
      )`;
  });

  const rows = await runQuery<BreakdownQueryRow>(
    tenant,
    `
    WITH base AS (
      SELECT
        user_pseudo_id,
        event_name,
        geo.country AS country,
        geo.region AS region,
        geo.city AS city,
        device.category AS deviceCategory,
        device.operating_system AS operatingSystem,
        device.web_info.browser AS browser,
        device.language AS language
      FROM \`${qualified}.events_*\`
      WHERE _TABLE_SUFFIX BETWEEN @startKey AND @endKey
    )
    ${parts.join("\nUNION ALL\n")}
    `,
    { startKey, endKey },
  );

  const result: AudienceBreakdowns = Object.fromEntries(
    dimensions.map((dimension) => [dimension, []]),
  );

  for (const row of rows) {
    const bucket = result[row.dimension];
    if (!bucket) continue;
    bucket.push({
      label: row.label?.trim() ? row.label : "(not set)",
      value: Number(row.value) || 0,
    });
  }

  for (const bucket of Object.values(result)) {
    bucket.sort((a, b) => b.value - a.value);
  }

  return result;
}
