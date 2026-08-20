import { auth } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { getDashboardPage, parseDateRange } from "@analytics/shared";
import { fetchPageMetrics } from "@analytics/backend";
import {
  DashboardPageHeader,
  MetricsPageRenderer,
  NarrativePageRenderer,
} from "@analytics/ui";
import { notFound, redirect } from "next/navigation";

type DashboardPageProps = {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{
    start?: string;
    end?: string;
    preset?: string;
  }>;
};

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

  let error: string | null = null;
  let result;
  try {
    result = await fetchPageMetrics(tenant, pageId, range.start, range.end);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load page data";
  }

  const mock =
    result?.kind === "metrics" ? result.data.mock : false;

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title={page.title}
        description={page.description}
        mock={mock}
      />

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
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

      {!error && result?.kind === "narrative" ? (
        <NarrativePageRenderer sections={result.sections} />
      ) : null}
    </div>
  );
}
