import { auth } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { getDashboardPage, parseDateRange } from "@analytics/shared";
import { fetchPageMetrics } from "@analytics/backend";
import {
  DashboardPageHeader,
  MetricsPageRenderer,
  NarrativePageRenderer,
  ProductIndexRenderer,
  DepartmentIndexRenderer,
} from "@analytics/ui";
import { notFound, redirect } from "next/navigation";

export const maxDuration = 180;

type DashboardPageProps = {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{
    start?: string;
    end?: string;
    preset?: string;
  }>;
};

function queryString(query: {
  start?: string;
  end?: string;
  preset?: string;
}): string {
  const params = new URLSearchParams();
  if (query.preset) params.set("preset", query.preset);
  if (query.start) params.set("start", query.start);
  if (query.end) params.set("end", query.end);
  return params.toString();
}

export default async function DashboardPageById({
  params,
  searchParams,
}: DashboardPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { pageId } = await params;
  const query = await searchParams;

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

  const isBriefingIndex =
    page.kind === "aiCommentary" || page.kind === "aiInsights";

  let error: string | null = null;
  let result;
  if (!isBriefingIndex) {
    try {
      result = await fetchPageMetrics(tenant, pageId, range.start, range.end);
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load page data";
    }
  }

  const mock =
    result?.kind === "metrics"
      ? result.data.mock
      : result?.kind === "productIndex"
        ? result.mock
        : result?.kind === "aiCommentary" || result?.kind === "aiInsights"
          ? result.report.mock
          : false;

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title={page.title}
        description={page.description}
        mock={mock}
      />

      {error ? (
        <div
          className="page-error"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {!error && result?.kind === "metrics" && page.kind === "metrics" ? (
        <MetricsPageRenderer
          widgets={page.widgets}
          plannedSections={page.plannedSections}
          data={result.data}
        />
      ) : null}

      {!error &&
      result?.kind === "productIndex" &&
      page.kind === "productIndex" ? (
        <ProductIndexRenderer
          pageId={page.id}
          models={result.models}
          query={queryString(query)}
        />
      ) : null}

      {!error && result?.kind === "narrative" ? (
        <NarrativePageRenderer sections={result.sections} />
      ) : null}

      {!error && isBriefingIndex ? (
        <DepartmentIndexRenderer
          pageId={page.id}
          variant={page.kind === "aiInsights" ? "insights" : "commentary"}
          query={queryString(query)}
        />
      ) : null}
    </div>
  );
}
