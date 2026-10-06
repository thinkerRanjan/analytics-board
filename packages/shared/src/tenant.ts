import { z } from "zod";
import {
  COMMENTARY_TEAM_IDS,
  COMMENTARY_TEAM_NAV,
  departmentHref,
} from "./commentary";

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

/**
 * GA4 event and parameter names are interpolated into SQL, so they are pinned
 * to plain identifiers here rather than sanitised later.
 */
const Ga4IdentifierSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9_]+$/, "must be letters, digits, or underscores");

export const GA4_IDENTIFIER_PATTERN = /^[A-Za-z0-9_]+$/;

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
    type: z.literal("eventBreakdown"),
    eventName: Ga4IdentifierSchema,
    /** Event parameter whose values are ranked. */
    param: Ga4IdentifierSchema,
    /** Optional second parameter to split the ranking by, e.g. car model. */
    groupBy: Ga4IdentifierSchema.optional(),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    /** Rows kept per group when grouped, or overall when not. */
    limit: z.number().int().positive().max(25).default(10),
    valueLabel: z.string().default("Events"),
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
  const names = pageWidgets(page)
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

export type EventBreakdownSpec = {
  eventName: string;
  param: string;
  groupBy?: string;
  /** Keep rows whose event param equals `filterValue`. */
  filterParam?: string;
  filterValue?: string;
};

/** Stable identity for a spec so two widgets on the same data share one query. */
export function eventBreakdownKey(spec: EventBreakdownSpec): string {
  return `${spec.eventName}.${spec.param}.${spec.groupBy ?? ""}`;
}

function pageWidgets(page: DashboardPage): Widget[] {
  if (page.kind === "metrics" || page.kind === "productIndex") {
    return page.widgets;
  }
  return [];
}

/** Event-parameter breakdowns a page needs, deduplicated. */
export function getPageEventBreakdowns(
  page: DashboardPage,
): EventBreakdownSpec[] {
  const specs = new Map<string, EventBreakdownSpec>();
  for (const widget of pageWidgets(page)) {
    if (widget.type !== "eventBreakdown") continue;
    const spec: EventBreakdownSpec = {
      eventName: widget.eventName,
      param: widget.param,
      groupBy: widget.groupBy,
    };
    specs.set(eventBreakdownKey(spec), spec);
  }
  return [...specs.values()];
}

/** Audience dimensions a page needs breakdowns for, derived from its widgets. */
export function getPageDimensions(page: DashboardPage): AudienceDimension[] {
  const dimensions = pageWidgets(page)
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

const MetricsWidgetsSchema = z.object({
  widgets: z.array(WidgetSchema).default([]),
  plannedSections: z.array(PlannedSectionSchema).default([]),
});

export const DashboardPageSchema = z.discriminatedUnion("kind", [
  MetricsWidgetsSchema.extend({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    kind: z.literal("metrics"),
  }),
  MetricsWidgetsSchema.extend({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    kind: z.literal("productIndex"),
    /** Event that carries the car-model dimension, e.g. configurator_loaded. */
    sourceEvent: Ga4IdentifierSchema,
    /** Event parameter whose distinct values become child pages, e.g. model. */
    sourceParam: Ga4IdentifierSchema,
  }),
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    kind: z.literal("narrative"),
    sections: z.array(NarrativeSectionSchema).default([]),
  }),
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    kind: z.literal("aiCommentary"),
  }),
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    kind: z.literal("aiInsights"),
  }),
]);
export type DashboardPage = z.infer<typeof DashboardPageSchema>;
export type ProductIndexPage = Extract<DashboardPage, { kind: "productIndex" }>;

export function getProductIndexPage(
  tenant: TenantConfig,
): ProductIndexPage | undefined {
  return tenant.dashboard.pages.find(
    (page): page is ProductIndexPage => page.kind === "productIndex",
  );
}

/** Scope every breakdown on a product page to the selected car model. */
export function scopedEventBreakdowns(
  page: DashboardPage,
  filterParam: string,
  filterValue: string,
): EventBreakdownSpec[] {
  return getPageEventBreakdowns(page).map((spec) => ({
    ...spec,
    filterParam,
    filterValue,
  }));
}

export function productModelHref(pageId: string, model: string): string {
  return `/dashboard/${pageId}/${encodeURIComponent(model)}`;
}

/** Union of BigQuery inputs needed to brief the commentary model. */
export function collectDashboardDataNeeds(tenant: TenantConfig): {
  eventNames: string[];
  dimensions: AudienceDimension[];
  eventSpecs: EventBreakdownSpec[];
  needsEngagement: boolean;
  productIndex?: ProductIndexPage;
} {
  const eventNames = new Set<string>();
  const dimensions = new Set<AudienceDimension>();
  const specs = new Map<string, EventBreakdownSpec>();
  let needsEngagement = false;
  let productIndex: ProductIndexPage | undefined;

  for (const page of tenant.dashboard.pages) {
    if (
      page.kind === "narrative" ||
      page.kind === "aiCommentary" ||
      page.kind === "aiInsights"
    ) {
      continue;
    }

    for (const name of getPageEventNames(page)) eventNames.add(name);
    for (const dimension of getPageDimensions(page)) dimensions.add(dimension);
    for (const spec of getPageEventBreakdowns(page)) {
      specs.set(eventBreakdownKey(spec), spec);
    }

    if (page.kind === "metrics" && pageNeedsEngagementMetrics(page)) {
      needsEngagement = true;
    }
    if (page.kind === "productIndex") {
      productIndex = page;
    }
  }

  if (eventNames.size > 0) needsEngagement = true;

  return {
    eventNames: [...eventNames],
    dimensions: [...dimensions],
    eventSpecs: [...specs.values()],
    needsEngagement,
    productIndex,
  };
}

export const TenantConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Site-relative path to a logo served from `apps/web/public`, e.g. `/tenants/skoda/logo.png`. */
  logo: z
    .string()
    .regex(/^\/[A-Za-z0-9/._-]+$/, "must be a site-relative path")
    .optional(),
  /** Brochure / PDF cover tokens. Dashboard chrome still uses global CSS. */
  brand: z
    .object({
      tagline: z.string().min(1).max(80).optional(),
      coverBackground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      coverForeground: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    })
    .optional(),
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
  kind: DashboardPage["kind"] | "model" | "department";
  href?: string;
  children?: DashboardNavItem[];
};

export function getDashboardNavItems(tenant: TenantConfig): DashboardNavItem[] {
  return tenant.dashboard.pages.map((page) => {
    const item: DashboardNavItem = {
      id: page.id,
      title: page.title,
      description: page.description,
      kind: page.kind,
    };
    if (page.kind === "aiCommentary" || page.kind === "aiInsights") {
      item.children = COMMENTARY_TEAM_IDS.map((teamId) => ({
        id: `${page.id}/${COMMENTARY_TEAM_NAV[teamId].slug}`,
        title: COMMENTARY_TEAM_NAV[teamId].title,
        kind: "department" as const,
        href: departmentHref(page.id, teamId),
      }));
    }
    return item;
  });
}

export function attachProductModels(
  items: DashboardNavItem[],
  pageId: string,
  models: { name: string; value: number }[],
): DashboardNavItem[] {
  return items.map((item) => {
    if (item.id !== pageId) return item;
    return {
      ...item,
      children: models.map((model) => ({
        id: `${pageId}/${model.name}`,
        title: model.name,
        kind: "model" as const,
        href: productModelHref(pageId, model.name),
      })),
    };
  });
}
