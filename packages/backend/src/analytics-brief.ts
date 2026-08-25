import type {
  AudienceBreakdowns,
  BreakdownRow,
  EventBreakdowns,
  GroupedBreakdownRow,
  OverviewMetrics,
  ProductModel,
  TenantConfig,
  TrendPoint,
} from "@analytics/shared";
import { collectDashboardDataNeeds, formatDuration } from "@analytics/shared";
import { fetchOverviewMetrics } from "./metrics";
import { fetchEngagementDaily } from "./engagement";
import { fetchAudienceBreakdowns } from "./audience";
import { fetchEventBreakdowns } from "./event-breakdowns";
import { fetchProductModels } from "./product-models";

const TOP_N = 8;

export type AnalyticsBrief = {
  tenant: string;
  tenantName: string;
  range: { start: string; end: string };
  mock: boolean;
  kpis: OverviewMetrics["kpis"];
  trend: {
    days: number;
    sessions: SeriesDigest;
    users: SeriesDigest;
    pageviews: SeriesDigest;
    conversions: SeriesDigest;
    activeUsers?: SeriesDigest;
    newUsers?: SeriesDigest;
    avgSessionSeconds?: { mean: number; label: string };
    events?: Record<string, SeriesDigest>;
  };
  sources: RankedShareRow[];
  pages: { pageTitle: string; pageviews: number; share: number; sharePct: number }[];
  audience: Record<string, RankedShareRow[]>;
  products: {
    models: RankedShareRow[];
    breakdowns: Record<
      string,
      (RankedShareRow & { group: string | null })[]
    >;
  };
  /** Precomputed rates so the model cites comparable KPIs instead of inventing them. */
  ops: OperationalMetrics;
  caveats: string[];
};

type RankedShareRow = {
  label: string;
  value: number;
  share: number;
  sharePct: number;
  source?: string;
  medium?: string;
};

type SeriesDigest = {
  total: number;
  first: number;
  last: number;
  mean: number;
  peak: { date: string; value: number };
  trough: { date: string; value: number };
  changeFirstToLast: number;
  changePct: number | null;
};

type OperationalMetrics = {
  conversionRate: number;
  conversionRatePct: number;
  pagesPerSession: number;
  sessionsPerUser: number;
  newUserShare: number;
  newUserSharePct: number;
  engagedUserShare: number;
  engagedUserSharePct: number;
  funnel: {
    sessions: number;
    configuratorStarted: number;
    configuratorLoaded: number;
    variantSelected: number;
    colourPreviewed: number;
    chatbotOpens: number;
    conversions: number;
    configuratorStartRate: number;
    configuratorLoadRate: number;
    loadToStartRatio: number;
    variantPerLoad: number;
    colourPerLoad: number;
    chatbotPerSession: number;
    conversionPerConfiguratorStart: number;
  };
  concentration: {
    topSourceShare: number;
    top3SourceShare: number;
    topModelShare: number;
    top3ModelShare: number;
    topCityShareOfListed: number;
    topDeviceShareOfListed: number;
    topRegionShareOfListed: number;
  };
};

export async function buildAnalyticsBrief(
  tenant: TenantConfig,
  start: string,
  end: string,
): Promise<AnalyticsBrief> {
  const needs = collectDashboardDataNeeds(tenant);

  const [overview, engagement, breakdowns, eventBreakdowns, models] =
    await Promise.all([
      fetchOverviewMetrics(tenant, start, end),
      needs.needsEngagement
        ? fetchEngagementDaily(tenant, start, end, needs.eventNames)
        : Promise.resolve([]),
      fetchAudienceBreakdowns(tenant, start, end, needs.dimensions),
      fetchEventBreakdowns(tenant, start, end, needs.eventSpecs),
      needs.productIndex
        ? fetchProductModels(
            tenant,
            start,
            end,
            needs.productIndex.sourceEvent,
            needs.productIndex.sourceParam,
          )
        : Promise.resolve<ProductModel[]>([]),
    ]);

  const byDate = new Map(engagement.map((point) => [point.date, point]));
  const trend: TrendPoint[] = overview.trend.map((point) => {
    const extra = byDate.get(point.date);
    if (!extra) return point;
    return {
      ...point,
      activeUsers: extra.activeUsers,
      newUsers: extra.newUsers,
      avgSessionSeconds: extra.avgSessionSeconds,
      events: extra.events,
    };
  });

  const trendDigest = digestTrend(trend, needs.eventNames);
  const sources = overview.sources.slice(0, TOP_N).map((row) => ({
    label: `${row.source}/${row.medium}`,
    source: row.source,
    medium: row.medium,
    value: row.sessions,
    ...shareFields(row.sessions, overview.kpis.sessions),
  }));
  const pageTotal = overview.pages.reduce((sum, page) => sum + page.pageviews, 0);
  const pages = overview.pages.slice(0, TOP_N).map((page) => ({
    pageTitle: page.pageTitle,
    pageviews: page.pageviews,
    ...shareFields(page.pageviews, pageTotal || overview.kpis.pageviews),
  }));
  const modelTotal = models.reduce((sum, model) => sum + model.value, 0);
  const rankedModels = models.slice(0, 10).map((model) => ({
    label: model.name,
    value: model.value,
    ...shareFields(model.value, modelTotal),
  }));
  const audience = compactAudience(breakdowns);

  const briefWithoutOps = {
    tenant: tenant.id,
    tenantName: tenant.name,
    range: { start, end },
    mock: overview.mock,
    kpis: overview.kpis,
    trend: trendDigest,
    sources,
    pages,
    audience,
    products: {
      models: rankedModels,
      breakdowns: compactEventBreakdowns(eventBreakdowns),
    },
  };

  return {
    ...briefWithoutOps,
    ops: deriveOps(briefWithoutOps),
    caveats: [
      "conversions are GA4 conversion events, not dealer invoices or bookings.",
      "audience shares are of the listed rows unless noted against sessions.",
      "source shares are of total sessions.",
      "model shares are of configurator_loaded (or the product-index event) in this range.",
      "no on-hand stock, plant capacity, or media spend is in this dataset — treat manufacturing and inventory notes as demand-sensing from digital intent.",
    ],
  };
}

function deriveOps(brief: {
  kpis: OverviewMetrics["kpis"];
  trend: AnalyticsBrief["trend"];
  sources: RankedShareRow[];
  audience: Record<string, RankedShareRow[]>;
  products: {
    models: RankedShareRow[];
    breakdowns: Record<string, (RankedShareRow & { group: string | null })[]>;
  };
}): OperationalMetrics {
  const sessions = brief.kpis.sessions;
  const users = brief.kpis.users;
  const events = brief.trend.events ?? {};
  const started = events.configurator_started?.total ?? 0;
  const loaded =
    events.configurator_loaded?.total ??
    brief.products.models.reduce((sum, model) => sum + model.value, 0);
  const variants =
    eventTotalByPrefix(events, "variant_selected") ||
    breakdownTotal(brief.products.breakdowns, "variant_selected");
  const colours =
    eventTotalByPrefix(events, "color_change_clicked") ||
    breakdownTotal(brief.products.breakdowns, "color_change_clicked");
  const chatbot = events.ai_chatbot_open_clicked?.total ?? 0;
  const conversions = brief.kpis.conversions;
  const newUsers = brief.trend.newUsers?.total ?? 0;
  const activeUsers = brief.trend.activeUsers?.total ?? 0;
  const top3Sources = brief.sources.slice(0, 3).reduce((sum, row) => sum + row.share, 0);
  const top3Models = brief.products.models
    .slice(0, 3)
    .reduce((sum, row) => sum + row.share, 0);

  return {
    conversionRate: ratio(conversions, sessions),
    conversionRatePct: pct(ratio(conversions, sessions)),
    pagesPerSession: round2(ratio(brief.kpis.pageviews, sessions)),
    sessionsPerUser: round2(ratio(sessions, users)),
    newUserShare: ratio(newUsers, users || newUsers),
    newUserSharePct: pct(ratio(newUsers, users || newUsers)),
    engagedUserShare: ratio(activeUsers, users || activeUsers),
    engagedUserSharePct: pct(ratio(activeUsers, users || activeUsers)),
    funnel: {
      sessions,
      configuratorStarted: started,
      configuratorLoaded: loaded,
      variantSelected: variants,
      colourPreviewed: colours,
      chatbotOpens: chatbot,
      conversions,
      configuratorStartRate: ratio(started, sessions),
      configuratorLoadRate: ratio(loaded, sessions),
      loadToStartRatio: ratio(loaded, started),
      variantPerLoad: round2(ratio(variants, loaded)),
      colourPerLoad: round2(ratio(colours, loaded)),
      chatbotPerSession: ratio(chatbot, sessions),
      conversionPerConfiguratorStart: ratio(conversions, started),
    },
    concentration: {
      topSourceShare: brief.sources[0]?.share ?? 0,
      top3SourceShare: round4(top3Sources),
      topModelShare: brief.products.models[0]?.share ?? 0,
      top3ModelShare: round4(top3Models),
      topCityShareOfListed: brief.audience.city?.[0]?.share ?? 0,
      topDeviceShareOfListed: brief.audience.deviceCategory?.[0]?.share ?? 0,
      topRegionShareOfListed: brief.audience.region?.[0]?.share ?? 0,
    },
  };
}

function breakdownTotal(
  breakdowns: Record<string, { value: number }[]>,
  match: string,
): number {
  return Object.entries(breakdowns)
    .filter(([key]) => key.includes(match))
    .reduce(
      (sum, [, rows]) => sum + rows.reduce((inner, row) => inner + row.value, 0),
      0,
    );
}

function eventTotalByPrefix(
  events: Record<string, SeriesDigest>,
  prefix: string,
): number {
  if (events[prefix]) return events[prefix]!.total;
  return Object.entries(events)
    .filter(([name]) => name.startsWith(prefix))
    .reduce((sum, [, digest]) => sum + digest.total, 0);
}

function digestTrend(trend: TrendPoint[], eventNames: string[]) {
  const avgSession = average(
    trend
      .map((point) => point.avgSessionSeconds)
      .filter((value): value is number => value != null),
  );

  const events: Record<string, SeriesDigest> = {};
  for (const name of eventNames) {
    events[name] = digest(
      trend.map((point) => ({
        date: point.date,
        value: point.events?.[name] ?? 0,
      })),
    );
  }

  return {
    days: trend.length,
    sessions: digest(
      trend.map((point) => ({ date: point.date, value: point.sessions })),
    ),
    users: digest(
      trend.map((point) => ({ date: point.date, value: point.users })),
    ),
    pageviews: digest(
      trend.map((point) => ({ date: point.date, value: point.pageviews })),
    ),
    conversions: digest(
      trend.map((point) => ({ date: point.date, value: point.conversions })),
    ),
    activeUsers: hasValues(trend, "activeUsers")
      ? digest(
          trend.map((point) => ({
            date: point.date,
            value: point.activeUsers ?? 0,
          })),
        )
      : undefined,
    newUsers: hasValues(trend, "newUsers")
      ? digest(
          trend.map((point) => ({
            date: point.date,
            value: point.newUsers ?? 0,
          })),
        )
      : undefined,
    avgSessionSeconds:
      avgSession != null
        ? { mean: Math.round(avgSession), label: formatDuration(avgSession) }
        : undefined,
    events: eventNames.length > 0 ? events : undefined,
  };
}

function hasValues(
  trend: TrendPoint[],
  key: "activeUsers" | "newUsers",
): boolean {
  return trend.some((point) => point[key] != null);
}

function digest(points: { date: string; value: number }[]): SeriesDigest {
  let total = 0;
  let peak = { date: points[0]?.date ?? "", value: 0 };
  let trough = { date: points[0]?.date ?? "", value: Number.POSITIVE_INFINITY };
  for (const point of points) {
    total += point.value;
    if (point.value > peak.value) peak = { date: point.date, value: point.value };
    if (point.value < trough.value)
      trough = { date: point.date, value: point.value };
  }
  if (!Number.isFinite(trough.value)) trough = { date: "", value: 0 };
  const first = Math.round(points[0]?.value ?? 0);
  const last = Math.round(points[points.length - 1]?.value ?? 0);
  const mean = points.length ? total / points.length : 0;
  return {
    total: Math.round(total),
    first,
    last,
    mean: Math.round(mean),
    peak,
    trough,
    changeFirstToLast: last - first,
    changePct: first === 0 ? null : round2((last - first) / first),
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function compactAudience(
  breakdowns: AudienceBreakdowns,
): Record<string, RankedShareRow[]> {
  return Object.fromEntries(
    Object.entries(breakdowns).map(([key, rows]) => {
      const sliced = rows.slice(0, TOP_N);
      const total = sliced.reduce((sum, row) => sum + row.value, 0);
      return [
        key,
        sliced.map((row) => ({
          ...compactRow(row),
          ...shareFields(row.value, total),
        })),
      ];
    }),
  );
}

function compactEventBreakdowns(
  breakdowns: EventBreakdowns,
): Record<string, (RankedShareRow & { group: string | null })[]> {
  return Object.fromEntries(
    Object.entries(breakdowns).map(([key, rows]) => [
      key,
      withGroupShares(rows.slice(0, 16)),
    ]),
  );
}

function withGroupShares(
  rows: GroupedBreakdownRow[],
): (RankedShareRow & { group: string | null })[] {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    const group = row.group ?? "__all__";
    grouped.set(group, (grouped.get(group) ?? 0) + row.value);
  }
  return rows.map((row) => {
    const basis = grouped.get(row.group ?? "__all__") ?? row.value;
    return {
      group: row.group,
      ...compactRow(row),
      ...shareFields(row.value, basis),
    };
  });
}

function compactRow(row: BreakdownRow | GroupedBreakdownRow): {
  label: string;
  value: number;
} {
  return { label: row.label, value: row.value };
}

function shareFields(value: number, basis: number): { share: number; sharePct: number } {
  const share = ratio(value, basis);
  return { share, sharePct: pct(share) };
}

function ratio(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return round4(numerator / denominator);
}

function pct(share: number): number {
  return round2(share * 100);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
