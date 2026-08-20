import { z } from "zod";

/** Metrics that are totalled into `OverviewMetrics.kpis` and can back a KPI card. */
export const CoreMetricIdSchema = z.enum([
  "sessions",
  "users",
  "pageviews",
  "conversions",
]);
export type CoreMetricId = z.infer<typeof CoreMetricIdSchema>;

/**
 * Metrics that can be plotted as a daily series. Engagement metrics are
 * excluded from `CoreMetricId` because they cannot be summed across days into
 * a single total (active users would double count, session time is an average).
 */
export const MetricIdSchema = z.enum([
  ...CoreMetricIdSchema.options,
  "activeUsers",
  "newUsers",
  "avgSessionSeconds",
]);
export type MetricId = z.infer<typeof MetricIdSchema>;

export const ENGAGEMENT_METRIC_IDS = [
  "activeUsers",
  "newUsers",
  "avgSessionSeconds",
] as const satisfies readonly MetricId[];

export function isEngagementMetric(metric: MetricId): boolean {
  return (ENGAGEMENT_METRIC_IDS as readonly string[]).includes(metric);
}

/** Dimensions the audience page can group users by. */
export const AudienceDimensionSchema = z.enum([
  "country",
  "region",
  "city",
  "deviceCategory",
  "operatingSystem",
  "browser",
  "language",
  "userType",
]);
export type AudienceDimension = z.infer<typeof AudienceDimensionSchema>;

const SpanSchema = z.enum(["half", "full"]).default("full");

export const WidgetSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("kpi"),
    metric: CoreMetricIdSchema,
    label: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("trend"),
    metric: MetricIdSchema,
    title: z.string().optional(),
    subtitle: z.string().optional(),
    span: SpanSchema,
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("eventTrend"),
    eventName: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    span: SpanSchema,
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("breakdown"),
    dimension: AudienceDimensionSchema,
    chart: z.enum(["bar", "donut"]).default("bar"),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    limit: z.number().int().positive().max(25).default(10),
    span: SpanSchema,
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("sources"),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("pages"),
  }),
]);
export type Widget = z.infer<typeof WidgetSchema>;

/** GA4 event names a page needs daily counts for, derived from its widgets. */
export function getPageEventNames(page: DashboardPage): string[] {
  if (page.kind !== "metrics") return [];
  const names = page.widgets
    .filter((widget) => widget.type === "eventTrend")
    .map((widget) => widget.eventName);
  return [...new Set(names)];
}

export function pageNeedsEngagementMetrics(page: DashboardPage): boolean {
  if (page.kind !== "metrics") return false;
  return page.widgets.some(
    (widget) =>
      widget.type === "eventTrend" ||
      (widget.type === "trend" && isEngagementMetric(widget.metric)),
  );
}

/** Audience dimensions a page needs breakdowns for, derived from its widgets. */
export function getPageDimensions(page: DashboardPage): AudienceDimension[] {
  if (page.kind !== "metrics") return [];
  const dimensions = page.widgets
    .filter((widget) => widget.type === "breakdown")
    .map((widget) => widget.dimension);
  return [...new Set(dimensions)];
}

export const PlannedSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});
export type PlannedSection = z.infer<typeof PlannedSectionSchema>;

export const NarrativeSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().default(""),
  updatedAt: z.string().optional(),
});
export type NarrativeSection = z.infer<typeof NarrativeSectionSchema>;

export const DashboardPageSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    kind: z.literal("metrics"),
    widgets: z.array(WidgetSchema).default([]),
    plannedSections: z.array(PlannedSectionSchema).default([]),
  }),
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    kind: z.literal("narrative"),
    sections: z.array(NarrativeSectionSchema).default([]),
  }),
]);
export type DashboardPage = z.infer<typeof DashboardPageSchema>;

export const TenantConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  auth: z.object({
    allowedEmails: z.array(z.string()).default([]),
    allowedDomains: z.array(z.string()).default([]),
  }),
  bigquery: z.object({
    projectId: z.string().min(1),
    dataset: z.string().min(1),
    location: z.string().default("US"),
  }),
  dashboard: z.object({
    title: z.string().min(1),
    defaultPageId: z.string().min(1),
    defaultPreset: z.enum(["7d", "28d", "90d"]).default("28d"),
    pages: z.array(DashboardPageSchema).min(1),
  }),
});
export type TenantConfig = z.infer<typeof TenantConfigSchema>;

export function getDashboardPage(
  tenant: TenantConfig,
  pageId: string,
): DashboardPage | undefined {
  return tenant.dashboard.pages.find((page) => page.id === pageId);
}

export function getDefaultPageId(tenant: TenantConfig): string {
  const { defaultPageId, pages } = tenant.dashboard;
  if (pages.some((page) => page.id === defaultPageId)) {
    return defaultPageId;
  }
  return pages[0]!.id;
}

export type DashboardNavItem = {
  id: string;
  title: string;
  description?: string;
  kind: DashboardPage["kind"];
};

export function getDashboardNavItems(tenant: TenantConfig): DashboardNavItem[] {
  return tenant.dashboard.pages.map((page) => ({
    id: page.id,
    title: page.title,
    description: page.description,
    kind: page.kind,
  }));
}
