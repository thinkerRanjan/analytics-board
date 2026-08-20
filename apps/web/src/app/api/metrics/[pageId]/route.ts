import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { getDashboardPage, parseDateRange } from "@analytics/shared";
import { fetchPageMetrics } from "@analytics/backend";

type RouteContext = {
  params: Promise<{ pageId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await resolveActiveTenant(session);
    const { pageId } = await context.params;
    const page = getDashboardPage(tenant, pageId);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const range = parseDateRange(
      searchParams.get("start"),
      searchParams.get("end"),
      searchParams.get("preset") ?? tenant.dashboard.defaultPreset,
    );

    const result = await fetchPageMetrics(
      tenant,
      pageId,
      range.start,
      range.end,
    );

    return NextResponse.json({
      ...result,
      page: { id: page.id, title: page.title, kind: page.kind },
      range,
      tenant: { id: tenant.id, name: tenant.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load metrics";
    const status = message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
