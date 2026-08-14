import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TenantConfigSchema,
  type TenantConfig,
} from "@analytics/shared";

function resolveTenantsRoot(): string {
  if (process.env.TENANTS_DIR && existsSync(process.env.TENANTS_DIR)) {
    return process.env.TENANTS_DIR;
  }

  const cwd = process.cwd();
  const candidates = [
    join(/* turbopackIgnore: true */ cwd, "tenants"),
    join(/* turbopackIgnore: true */ cwd, "..", "..", "tenants"),
    join(/* turbopackIgnore: true */ cwd, "..", "..", "..", "tenants"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find tenants/ directory. Set TENANTS_DIR or run from the monorepo root / apps/web.",
  );
}

let cache: Map<string, TenantConfig> | null = null;

export function loadTenants(): Map<string, TenantConfig> {
  if (cache) return cache;

  const root = resolveTenantsRoot();
  const map = new Map<string, TenantConfig>();

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const filePath = join(root, entry.name, "tenant.json");
    if (!existsSync(filePath)) continue;

    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    const parsed = TenantConfigSchema.parse(raw);
    if (parsed.id !== entry.name) {
      throw new Error(
        `Tenant folder "${entry.name}" must match config id "${parsed.id}"`,
      );
    }
    map.set(parsed.id, parsed);
  }

  if (map.size === 0) {
    throw new Error(`No tenant configs found under ${root}`);
  }

  cache = map;
  return map;
}

export function getTenant(tenantId: string): TenantConfig {
  const tenant = loadTenants().get(tenantId);
  if (!tenant) {
    throw new Error(`Unknown tenant: ${tenantId}`);
  }
  return tenant;
}

export function listTenants(): TenantConfig[] {
  return Array.from(loadTenants().values());
}

export function clearTenantCache(): void {
  cache = null;
}
