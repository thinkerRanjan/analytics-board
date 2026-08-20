import type { TenantConfig } from "@analytics/shared";
import { getTenant, listTenants } from "./registry";

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

export function emailMatchesTenant(
  email: string,
  tenant: TenantConfig,
): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  if (normalized === "demo@analytics.local" && tenant.id === "demo") {
    return true;
  }

  const { allowedEmails, allowedDomains } = tenant.auth;

  if (allowedEmails.some((e) => normalizeEmail(e) === normalized)) {
    return true;
  }

  const domain = normalized.includes("@")
    ? normalized.split("@")[1]
    : "";

  return allowedDomains
    .map((d) => d.replace(/^@/, "").trim().toLowerCase())
    .filter(Boolean)
    .some((clean) => domain === clean);
}

export function resolveTenantsForEmail(email: string | null | undefined): TenantConfig[] {
  const normalized = normalizeEmail(email ?? undefined);
  if (!normalized) return [];
  return listTenants().filter((tenant) => emailMatchesTenant(normalized, tenant));
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
  const skoda = tenants.find((t) => t.id === "skoda");
  if (skoda) return skoda.id;
  return tenants[0].id;
}
