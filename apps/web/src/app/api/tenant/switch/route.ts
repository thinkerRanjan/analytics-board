import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TENANT_COOKIE } from "@/lib/tenant-session";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { tenantId?: string };
  const tenantId = body.tenantId;
  if (!tenantId || !session.tenantIds.includes(tenantId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, tenantId });
  response.cookies.set(TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
