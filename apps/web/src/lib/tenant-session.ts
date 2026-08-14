import { cookies } from "next/headers";
import type { Session } from "next-auth";
import { assertTenantAccess, getTenant } from "@analytics/backend";
import type { TenantConfig } from "@analytics/shared";

export const TENANT_COOKIE = "analytics_tenant";

export async function resolveActiveTenant(
  session: Session,
): Promise<TenantConfig> {
  const email = session.user?.email;
  const allowed = session.tenantIds ?? [];
  if (!email || allowed.length === 0) {
    throw new Error("No tenant access");
  }

  const jar = await cookies();
  const fromCookie = jar.get(TENANT_COOKIE)?.value;
  const preferred =
    fromCookie && allowed.includes(fromCookie)
      ? fromCookie
      : session.tenantId && allowed.includes(session.tenantId)
        ? session.tenantId
        : allowed[0];

  return assertTenantAccess(email, preferred);
}

export function publicTenantSummary(tenant: TenantConfig) {
  return {
    id: tenant.id,
    name: tenant.name,
    dashboard: tenant.dashboard,
  };
}

export function getTenantSafe(tenantId: string) {
  return getTenant(tenantId);
}
