import { auth } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import {
  COMMENTARY_TEAM_COPY,
  COMMENTARY_TEAM_NAV,
  INSIGHT_TEAM_COPY,
  getDashboardPage,
  parseCommentaryTeamId,
  parseDateRange,
  type ProductIndexPage,
  type TenantConfig,
} from "@analytics/shared";
import {
  fetchCommentary,
  fetchInsights,
  fetchProductModelMetrics,
} from "@analytics/backend";
import {
  CommentaryPageRenderer,
  DashboardPageHeader,
  InsightsPageRenderer,
  MetricsPageRenderer,
} from "@analytics/ui";
import { notFound, redirect } from "next/navigation";

export const maxDuration = 180;

type NestedDashboardPageProps = {
  params: Promise<{ pageId: string; model: string }>;
  searchParams: Promise<{
    start?: string;
    end?: string;
    preset?: string;
  }>;
};

export default async function NestedDashboardPage({
  params,
  searchParams,
}: NestedDashboardPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { pageId, model: rawSlug } = await params;
  const query = await searchParams;
  const slug = decodeSlug(rawSlug);
  if (!slug) {
    notFound();
  }

  let tenant;
  try {
    tenant = await resolveActiveTenant(session);
  } catch {
    redirect("/login?error=AccessDenied");
  }

  const page = getDashboardPage(tenant, pageId);
  if (!page) {
    notFound();
  }

  const range = parseDateRange(
    query.start,
    query.end,
    query.preset ?? tenant.dashboard.defaultPreset,
  );

  if (page.kind === "productIndex") {
    return renderProductModel(tenant, page, slug, range);
  }

  if (page.kind === "aiCommentary" || page.kind === "aiInsights") {
    return renderDepartment(tenant, page.kind, slug, range);
  }

  notFound();
}

async function renderProductModel(
  tenant: TenantConfig,
  page: ProductIndexPage,
  model: string,
  range: { start: string; end: string },
) {
  let error: string | null = null;
  let data;
  try {
    data = await fetchProductModelMetrics(
      tenant,
      page,
      model,
      range.start,
      range.end,
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load model data";
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title={model}
        description={
          page.description ??
          `Configurator and variant analytics for ${model}.`
        }
        mock={data?.mock}
      />

      {error ? (
        <div className="page-error" role="alert">
          {error}
        </div>
      ) : null}

      {!error && data ? (
        <MetricsPageRenderer
          widgets={page.widgets}
          plannedSections={page.plannedSections}
          data={data}
        />
      ) : null}
    </div>
  );
}

async function renderDepartment(
  tenant: TenantConfig,
  kind: "aiCommentary" | "aiInsights",
  slug: string,
  range: { start: string; end: string },
) {
  const teamId = parseCommentaryTeamId(slug);
  if (!teamId) {
    notFound();
  }

  const copy =
    kind === "aiCommentary"
      ? COMMENTARY_TEAM_COPY[teamId]
      : INSIGHT_TEAM_COPY[teamId];

  let error: string | null = null;
  let mock = false;
  let commentaryReport;
  let insightReport;
  try {
    if (kind === "aiCommentary") {
      commentaryReport = await fetchCommentary(tenant, range.start, range.end);
      mock = commentaryReport.mock;
    } else {
      insightReport = await fetchInsights(tenant, range.start, range.end);
      mock = insightReport.mock;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load page data";
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title={COMMENTARY_TEAM_NAV[teamId].title}
        description={copy.blurb}
        mock={mock}
      />

      {error ? (
        <div className="page-error" role="alert">
          {error}
        </div>
      ) : null}

      {!error && commentaryReport ? (
        <CommentaryPageRenderer report={commentaryReport} teamId={teamId} />
      ) : null}

      {!error && insightReport ? (
        <InsightsPageRenderer report={insightReport} teamId={teamId} />
      ) : null}
    </div>
  );
}

function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}
