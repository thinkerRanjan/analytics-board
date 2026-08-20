import { z } from "zod";

export const MetricIdSchema = z.enum([
  "sessions",
  "users",
  "pageviews",
  "conversions",
]);
export type MetricId = z.infer<typeof MetricIdSchema>;

export const WidgetSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("kpi"),
    metric: MetricIdSchema,
    label: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("trend"),
    metric: MetricIdSchema,
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
