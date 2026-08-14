import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { healthCheckBigQuery } from "@analytics/backend";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await resolveActiveTenant(session);
    const result = await healthCheckBigQuery(tenant);
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
