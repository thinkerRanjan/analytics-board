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
    defaultPreset: z.enum(["7d", "28d", "90d"]).default("28d"),
    widgets: z.array(WidgetSchema).min(1),
  }),
});
export type TenantConfig = z.infer<typeof TenantConfigSchema>;
