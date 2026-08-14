import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { parseDateRange } from "@analytics/shared";
import { fetchOverviewMetrics } from "@analytics/backend";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await resolveActiveTenant(session);
    const { searchParams } = request.nextUrl;
    const range = parseDateRange(
      searchParams.get("start"),
      searchParams.get("end"),
      searchParams.get("preset") ?? tenant.dashboard.defaultPreset,
    );

    const data = await fetchOverviewMetrics(tenant, range.start, range.end);
    return NextResponse.json({
      ...data,
      range,
      tenant: { id: tenant.id, name: tenant.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load metrics";
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
