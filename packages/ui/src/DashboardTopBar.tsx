"use client";

import { ProfileMenu } from "./ProfileMenu";
import { TenantSwitcher, type TenantOption } from "./TenantSwitcher";
import { ThemeToggle } from "./ThemeToggle";

type DashboardTopBarProps = {
  tenantName: string;
  dashboardTitle: string;
  tenants: TenantOption[];
  activeTenantId: string;
  user: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  signOutAction: () => Promise<void>;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function DashboardTopBar({
  tenantName,
  dashboardTitle,
  tenants,
  activeTenantId,
  user,
  signOutAction,
}: DashboardTopBarProps) {
  return (
    <header className="shell-topbar">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shell-brand-mark">{initials(tenantName)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {tenantName}
            </p>
            <p className="shell-topbar-muted truncate text-xs leading-tight">
              {dashboardTitle} · GA4 · BigQuery
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <TenantSwitcher tenants={tenants} activeTenantId={activeTenantId} />
          <ProfileMenu user={user} signOutAction={signOutAction} />
        </div>
      </div>
    </header>
  );
}
