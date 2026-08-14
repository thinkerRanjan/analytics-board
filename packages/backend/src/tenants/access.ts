import type { TenantConfig } from "@analytics/shared";
import { getTenant, listTenants } from "./registry";

export function emailMatchesTenant(
  email: string,
  tenant: TenantConfig,
): boolean {
  const normalized = email.toLowerCase();

  if (normalized === "demo@analytics.local" && tenant.id === "demo") {
    return true;
  }

  const { allowedEmails, allowedDomains } = tenant.auth;

  if (allowedEmails.some((e) => e.toLowerCase() === normalized)) {
    return true;
  }

  const domain = normalized.includes("@")
    ? normalized.split("@")[1]
    : "";

  return allowedDomains.some((d) => {
    const clean = d.replace(/^@/, "").toLowerCase();
    return domain === clean;
  });
}

export function resolveTenantsForEmail(email: string | null | undefined): TenantConfig[] {
  if (!email) return [];
  return listTenants().filter((tenant) => emailMatchesTenant(email, tenant));
}

export function assertTenantAccess(
  email: string | null | undefined,
  tenantId: string,
): TenantConfig {
  const tenant = getTenant(tenantId);
  if (!email || !emailMatchesTenant(email, tenant)) {
    throw new Error("Forbidden: no access to this tenant");
  }
  return tenant;
}

export function pickDefaultTenantId(tenants: TenantConfig[]): string | null {
  if (tenants.length === 0) return null;
  return tenants[0].id;
}
