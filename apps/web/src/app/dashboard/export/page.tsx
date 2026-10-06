import { auth } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { fetchFullDashboardReport } from "@analytics/backend";
import { getDefaultPageId, parseDateRange } from "@analytics/shared";
import {
  ExportPrintCanvas,
  ExportReportToolbar,
  FullReportDocument,
} from "@analytics/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const maxDuration = 180;

export const metadata: Metadata = {
  title: "Export report",
};

type ExportPageProps = {
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

export default async function ExportReportPage({ searchParams }: ExportPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const query = await searchParams;

  let tenant;
  try {
    tenant = await resolveActiveTenant(session);
  } catch {
    redirect("/login?error=AccessDenied");
  }

  const range = parseDateRange(
    query.start,
    query.end,
    query.preset ?? tenant.dashboard.defaultPreset,
  );

  let report;
  let error: string | null = null;
  try {
    report = await fetchFullDashboardReport(
      tenant,
      range.start,
      range.end,
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load report";
  }

  const qs = queryString({
    preset: range.preset === "custom" ? "custom" : range.preset,
    start: range.preset === "custom" ? range.start : undefined,
    end: range.preset === "custom" ? range.end : undefined,
  });
  const defaultPage = getDefaultPageId(tenant);
  const backHref = qs ? `/dashboard/${defaultPage}?${qs}` : `/dashboard/${defaultPage}`;
  const printTitle = report
    ? `${report.dashboardTitle} ${report.start} to ${report.end}`
    : `${tenant.dashboard.title} ${range.start} to ${range.end}`;

  return (
    <div className="export-page">
      <ExportPrintCanvas />
      <ExportReportToolbar backHref={backHref} printTitle={printTitle} />
      {error ? (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="page-error" role="alert">
            {error}
          </div>
        </div>
      ) : null}
      {report ? <FullReportDocument report={report} /> : null}
    </div>
  );
}
