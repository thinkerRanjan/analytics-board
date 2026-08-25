import type {
  EventBreakdowns,
  EventBreakdownSpec,
  TenantConfig,
} from "@analytics/shared";
import { GA4_IDENTIFIER_PATTERN, eventBreakdownKey } from "@analytics/shared";
import { runQuery, useMockData } from "./bigquery";
import { getMockEventBreakdowns } from "./mock-data";

/** Rows kept per spec before widgets apply their own limit. */
const ROWS_PER_SPEC = 200;

type EventBreakdownQueryRow = {
  spec: string;
  grp: string | null;
  label: string | null;
  value: number | string;
};

const stringParam = (key: string) =>
  `(SELECT value.string_value FROM UNNEST(event_params) WHERE key = '${key}')`;

/**
 * Ranks GA4 event parameter values, optionally split by a second parameter.
 * Powers product analytics like "configurator opens per model" or
 * "top variant per model".
 */
export async function fetchEventBreakdowns(
  tenant: TenantConfig,
  start: string,
  end: string,
  specs: EventBreakdownSpec[],
): Promise<EventBreakdowns> {
  if (specs.length === 0) return {};

  // Identifiers are interpolated into SQL, so anything unexpected is dropped
  // rather than escaped.
  const safe = specs.filter(
    (spec) =>
      GA4_IDENTIFIER_PATTERN.test(spec.eventName) &&
      GA4_IDENTIFIER_PATTERN.test(spec.param) &&
      (spec.groupBy === undefined || GA4_IDENTIFIER_PATTERN.test(spec.groupBy)) &&
      (spec.filterParam === undefined ||
        GA4_IDENTIFIER_PATTERN.test(spec.filterParam)),
  );
  if (safe.length === 0) return {};

  if (useMockData()) {
    return getMockEventBreakdowns(tenant.id, safe);
  }

  const qualified = `${tenant.bigquery.projectId}.${tenant.bigquery.dataset}`;
  const startKey = start.replaceAll("-", "");
  const endKey = end.replaceAll("-", "");
  const eventNames = [...new Set(safe.map((spec) => spec.eventName))];
  const queryParams: Record<string, unknown> = { startKey, endKey, eventNames };

  const parts = safe.map((spec, index) => {
    const key = eventBreakdownKey(spec);
    const group = spec.groupBy
      ? `IFNULL(NULLIF(${stringParam(spec.groupBy)}, ''), '(not set)')`
      : "CAST(NULL AS STRING)";

    let filterSql = "";
    if (
      spec.filterParam &&
      spec.filterValue &&
      GA4_IDENTIFIER_PATTERN.test(spec.filterParam)
    ) {
      const paramName = `filterValue${index}`;
      queryParams[paramName] = spec.filterValue;
      filterSql = `AND IFNULL(NULLIF(${stringParam(spec.filterParam)}, ''), '(not set)') = @${paramName}`;
    }

    return `
      SELECT '${key}' AS spec, grp, label, value FROM (
        SELECT
          ${group} AS grp,
          IFNULL(NULLIF(${stringParam(spec.param)}, ''), '(not set)') AS label,
          COUNT(*) AS value
        FROM base
        WHERE event_name = '${spec.eventName}'
          ${filterSql}
        GROUP BY grp, label
        ORDER BY value DESC
        LIMIT ${ROWS_PER_SPEC}
      )`;
  });

  const rows = await runQuery<EventBreakdownQueryRow>(
    tenant,
    `
    WITH base AS (
      SELECT event_name, event_params
      FROM \`${qualified}.events_*\`
      WHERE _TABLE_SUFFIX BETWEEN @startKey AND @endKey
        AND event_name IN UNNEST(@eventNames)
    )
    ${parts.join("\nUNION ALL\n")}
    `,
    queryParams,
  );

  const result: EventBreakdowns = Object.fromEntries(
    safe.map((spec) => [eventBreakdownKey(spec), []]),
  );

  for (const row of rows) {
    const bucket = result[row.spec];
    if (!bucket) continue;
    bucket.push({
      group: row.grp,
      label: row.label?.trim() ? row.label : "(not set)",
      value: Number(row.value) || 0,
    });
  }

  for (const bucket of Object.values(result)) {
    bucket.sort((a, b) => b.value - a.value);
  }

  return result;
}
