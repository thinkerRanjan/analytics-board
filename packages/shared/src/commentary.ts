import { z } from "zod";

export const CommentaryTeamIdSchema = z.enum([
  "marketing",
  "sales",
  "manufacturing",
  "inventory",
]);
export type CommentaryTeamId = z.infer<typeof CommentaryTeamIdSchema>;

export const CommentaryCategorySchema = z.enum(["win", "gap"]);
export type CommentaryCategory = z.infer<typeof CommentaryCategorySchema>;

export const InsightCategorySchema = z.enum(["conclusion", "suggestion"]);
export type InsightCategory = z.infer<typeof InsightCategorySchema>;

const CardBaseSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(110),
  body: z.string().min(1).max(1800),
});

export const CommentaryCardSchema = CardBaseSchema.extend({
  category: CommentaryCategorySchema,
});
export type CommentaryCard = z.infer<typeof CommentaryCardSchema>;

export const InsightCardSchema = CardBaseSchema.extend({
  category: InsightCategorySchema,
});
export type InsightCard = z.infer<typeof InsightCardSchema>;

function teamSchema<T extends z.ZodTypeAny>(cardSchema: T) {
  return z.object({
    id: CommentaryTeamIdSchema,
    title: z.string().min(1).max(48),
    summary: z.string().max(480).optional(),
    cards: z.array(cardSchema).min(4).max(8),
  });
}

export const CommentaryTeamSchema = teamSchema(CommentaryCardSchema);
export type CommentaryTeam = z.infer<typeof CommentaryTeamSchema>;

export const InsightTeamSchema = teamSchema(InsightCardSchema);
export type InsightTeam = z.infer<typeof InsightTeamSchema>;

function hasAllTeams<T extends { id: string }>(teams: T[]): boolean {
  const ids = new Set(teams.map((team) => team.id));
  return (
    ids.has("marketing") &&
    ids.has("sales") &&
    ids.has("manufacturing") &&
    ids.has("inventory")
  );
}

const CommentaryLlmPayloadSchema = z.object({
  headline: z.string().min(1).max(280).optional(),
  teams: z
    .array(CommentaryTeamSchema)
    .min(1)
    .refine(hasAllTeams, {
      message:
        "commentary must include marketing, sales, manufacturing, and inventory",
    }),
});

const InsightLlmPayloadSchema = z.object({
  headline: z.string().min(1).max(280).optional(),
  teams: z
    .array(InsightTeamSchema)
    .min(1)
    .refine(hasAllTeams, {
      message:
        "insights must include marketing, sales, manufacturing, and inventory",
    }),
});

export const CommentaryReportSchema = CommentaryLlmPayloadSchema.extend({
  generatedAt: z.string().min(1),
  range: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
  }),
  cached: z.boolean().default(false),
  mock: z.boolean().default(false),
});
export type CommentaryReport = z.infer<typeof CommentaryReportSchema>;

export const InsightReportSchema = InsightLlmPayloadSchema.extend({
  generatedAt: z.string().min(1),
  range: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
  }),
  cached: z.boolean().default(false),
  mock: z.boolean().default(false),
});
export type InsightReport = z.infer<typeof InsightReportSchema>;

export const BriefingLlmPayloadSchema = z.object({
  commentary: CommentaryLlmPayloadSchema,
  insights: InsightLlmPayloadSchema,
});
export type BriefingLlmPayload = z.infer<typeof BriefingLlmPayloadSchema>;

export const BriefingReportSchema = z.object({
  commentary: CommentaryLlmPayloadSchema,
  insights: InsightLlmPayloadSchema,
  generatedAt: z.string().min(1),
  range: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
  }),
  cached: z.boolean().default(false),
  mock: z.boolean().default(false),
});
export type BriefingReport = z.infer<typeof BriefingReportSchema>;

export const CommentaryLlmPayload = CommentaryLlmPayloadSchema;
export type CommentaryLlmPayload = z.infer<typeof CommentaryLlmPayloadSchema>;

export const COMMENTARY_TEAM_IDS = [
  "marketing",
  "sales",
  "manufacturing",
  "inventory",
] as const satisfies readonly CommentaryTeamId[];

export const COMMENTARY_TEAM_NAV: Record<
  CommentaryTeamId,
  { title: string; slug: string }
> = {
  marketing: { title: "Marketing", slug: "marketing" },
  sales: { title: "Sales", slug: "sales" },
  manufacturing: { title: "Manufacturing", slug: "manufacturing" },
  inventory: { title: "Inventory management", slug: "inventory" },
};

export function commentaryTeamSlug(teamId: CommentaryTeamId): string {
  return COMMENTARY_TEAM_NAV[teamId].slug;
}

export function parseCommentaryTeamId(raw: string): CommentaryTeamId | null {
  let slug = raw.trim();
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // keep raw
  }
  slug = slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (slug === "inventory-management") slug = "inventory";
  return (COMMENTARY_TEAM_IDS as readonly string[]).includes(slug)
    ? (slug as CommentaryTeamId)
    : null;
}

export function departmentHref(pageId: string, teamId: CommentaryTeamId): string {
  return `/dashboard/${pageId}/${encodeURIComponent(commentaryTeamSlug(teamId))}`;
}

export const COMMENTARY_TEAM_COPY: Record<
  CommentaryTeamId,
  { title: string; blurb: string }
> = {
  marketing: {
    title: "Marketing",
    blurb: "Acquisition mix, engagement quality, and channel concentration this period.",
  },
  sales: {
    title: "Sales",
    blurb: "Funnel volume, consideration intent, and conversion leakage as recorded.",
  },
  manufacturing: {
    title: "Manufacturing",
    blurb: "Model mix, option take-rate, and digital demand signals for production planning.",
  },
  inventory: {
    title: "Inventory management",
    blurb: "SKU-level demand sensing, colour/trim mix, and regional allocation signals.",
  },
};

export const INSIGHT_TEAM_COPY: Record<
  CommentaryTeamId,
  { title: string; blurb: string }
> = {
  marketing: {
    title: "Marketing",
    blurb: "Media mix, targeting, and landing-page implications from the acquisition data.",
  },
  sales: {
    title: "Sales",
    blurb: "Pipeline coverage, lead routing, and conversion-path recommendations.",
  },
  manufacturing: {
    title: "Manufacturing",
    blurb: "Mix planning, take-rate, and MPS inputs inferred from configurator demand.",
  },
  inventory: {
    title: "Inventory management",
    blurb: "Allocation, replenishment, and slow-mover calls from digital demand sensing.",
  },
};

export const COMMENTARY_CATEGORY_COPY: Record<
  CommentaryCategory,
  { label: string }
> = {
  win: { label: "Going well" },
  gap: { label: "Shortcoming" },
};

export const INSIGHT_CATEGORY_COPY: Record<InsightCategory, { label: string }> =
  {
    conclusion: { label: "Conclusion" },
    suggestion: { label: "Suggestion" },
  };
