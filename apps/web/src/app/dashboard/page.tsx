import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { parseDateRange } from "@analytics/shared";
import { fetchOverviewMetrics } from "@analytics/backend";
import { DashboardRenderer, DateRangePicker } from "@analytics/ui";
import { redirect } from "next/navigation";

type DashboardPageProps = {
  searchParams: Promise<{
    start?: string;
    end?: string;
    preset?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  let tenant;
  try {
    tenant = await resolveActiveTenant(session);
  } catch {
    redirect("/login?error=AccessDenied");
  }

  const range = parseDateRange(
    params.start,
    params.end,
    params.preset ?? tenant.dashboard.defaultPreset,
  );

  let data;
  let error: string | null = null;
  try {
    data = await fetchOverviewMetrics(tenant, range.start, range.end);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load metrics";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {tenant.dashboard.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {range.start} → {range.end}
            {data?.mock ? (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                Mock data
              </span>
            ) : null}
          </p>
        </div>
        <Suspense fallback={<div className="h-10 w-64 animate-pulse rounded bg-slate-200" />}>
          <DateRangePicker
            start={range.start}
            end={range.end}
            preset={range.preset}
          />
        </Suspense>
      </div>

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {!error && data ? (
        <DashboardRenderer config={tenant.dashboard} data={data} />
      ) : null}
    </div>
  );
}
