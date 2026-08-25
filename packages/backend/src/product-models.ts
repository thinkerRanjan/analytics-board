import { eachDayOfInterval, format, parseISO } from "date-fns";
import type {
  EngagementPoint,
  ProductModel,
  TenantConfig,
} from "@analytics/shared";
import { GA4_IDENTIFIER_PATTERN } from "@analytics/shared";
import { runQuery, useMockData } from "./bigquery";
import { getMockEngagement, getMockProductModels } from "./mock-data";

type ModelRow = {
  name: string | null;
  value: number | string;
};

type EventCountRow = {
  event_date: string;
  eventName: string;
  count: number | string;
};

const MAX_MODELS = 40;
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
const num = (value: unknown): number => Number(value) || 0;

const stringParamSql = (keyParam: string) =>
  `(SELECT value.string_value FROM UNNEST(event_params) WHERE key = @${keyParam})`;

type ModelCacheEntry = { expires: number; models: ProductModel[] };
const modelCache = new Map<string, ModelCacheEntry>();

export async function fetchProductModels(
  tenant: TenantConfig,
  start: string,
  end: string,
  eventName: string,
  param: string,
): Promise<ProductModel[]> {
  if (
    !GA4_IDENTIFIER_PATTERN.test(eventName) ||
    !GA4_IDENTIFIER_PATTERN.test(param)
  ) {
    return [];
  }

  const cacheKey = `${tenant.id}:${start}:${end}:${eventName}:${param}:${useMockData()}`;
  const hit = modelCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.models;

  const models = useMockData()
    ? getMockProductModels(tenant.id)
    : await queryProductModels(tenant, start, end, eventName, param);

  modelCache.set(cacheKey, {
    expires: Date.now() + MODEL_CACHE_TTL_MS,
    models,
  });
  return models;
}

async function queryProductModels(
  tenant: TenantConfig,
  start: string,
  end: string,
  eventName: string,
  param: string,
): Promise<ProductModel[]> {
  const qualified = `${tenant.bigquery.projectId}.${tenant.bigquery.dataset}`;
  const startKey = start.replaceAll("-", "");
  const endKey = end.replaceAll("-", "");

  const rows = await runQuery<ModelRow>(
    tenant,
    `
    SELECT
      IFNULL(NULLIF(${stringParamSql("param")}, ''), '(not set)') AS name,
      COUNT(*) AS value
    FROM \`${qualified}.events_*\`
    WHERE _TABLE_SUFFIX BETWEEN @startKey AND @endKey
      AND event_name = @eventName
    GROUP BY name
    HAVING name != '(not set)'
    ORDER BY value DESC
    LIMIT ${MAX_MODELS}
    `,
    { startKey, endKey, eventName, param },
  );

  return rows
    .map((row) => ({
      name: row.name?.trim() ?? "",
      value: num(row.value),
    }))
    .filter((row) => row.name.length > 0);
}

/**
 * Daily event counts scoped to a single car model. Returns the same shape as
 * engagement so existing trend charts can plot `events.<name>`.
 */
export async function fetchModelEventDaily(
  tenant: TenantConfig,
  start: string,
  end: string,
  eventNames: string[],
  filterParam: string,
  filterValue: string,
): Promise<EngagementPoint[]> {
  const safeNames = eventNames.filter((name) =>
    GA4_IDENTIFIER_PATTERN.test(name),
  );
  if (
    safeNames.length === 0 ||
    !GA4_IDENTIFIER_PATTERN.test(filterParam) ||
    !filterValue
  ) {
    return [];
  }

  if (useMockData()) {
    const points = getMockEngagement(tenant.id, start, end, safeNames);
    const scale = 0.15 + (Math.abs(hash(filterValue)) % 40) / 100;
    return points.map((point) => ({
      ...point,
      events: Object.fromEntries(
        Object.entries(point.events).map(([name, count]) => [
          name,
          Math.max(0, Math.round(count * scale)),
        ]),
      ),
    }));
  }

  const qualified = `${tenant.bigquery.projectId}.${tenant.bigquery.dataset}`;
  const startKey = start.replaceAll("-", "");
  const endKey = end.replaceAll("-", "");

  const rows = await runQuery<EventCountRow>(
    tenant,
    `
    SELECT
      FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) AS event_date,
      event_name AS eventName,
      COUNT(*) AS count
    FROM \`${qualified}.events_*\`
    WHERE _TABLE_SUFFIX BETWEEN @startKey AND @endKey
      AND event_name IN UNNEST(@eventNames)
      AND IFNULL(NULLIF(${stringParamSql("filterParam")}, ''), '(not set)') = @filterValue
    GROUP BY event_date, eventName
    ORDER BY event_date
    `,
    {
      startKey,
      endKey,
      eventNames: safeNames,
      filterParam,
      filterValue,
    },
  );

  const countsByDate = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const bucket = countsByDate.get(row.event_date) ?? {};
    bucket[row.eventName] = num(row.count);
    countsByDate.set(row.event_date, bucket);
  }

  const days = eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  });

  return days.map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const counts = countsByDate.get(date) ?? {};
    return {
      date,
      activeUsers: 0,
      newUsers: 0,
      avgSessionSeconds: 0,
      events: Object.fromEntries(
        safeNames.map((name) => [name, counts[name] ?? 0]),
      ),
    };
  });
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}
