"use client";

import type { DashboardNavItem } from "@analytics/shared";
import { DashboardFiltersBar } from "./DashboardFiltersBar";
import { DashboardNavDrawer } from "./DashboardNavDrawer";
import { DashboardTopBar } from "./DashboardTopBar";
import type { TenantOption } from "./TenantSwitcher";

type DashboardAppShellProps = {
  tenantName: string;
  tenantLogo?: string | null;
  dashboardTitle: string;
  pages: DashboardNavItem[];
  tenants: TenantOption[];
  activeTenantId: string;
  defaultPreset: "7d" | "28d" | "90d";
  user: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
};

export function DashboardAppShell({
  tenantName,
  tenantLogo,
  dashboardTitle,
  pages,
  tenants,
  activeTenantId,
  defaultPreset,
  user,
  signOutAction,
  children,
}: DashboardAppShellProps) {
  return (
    <div className="min-h-full">
      <DashboardTopBar
        tenantName={tenantName}
        tenantLogo={tenantLogo}
        dashboardTitle={dashboardTitle}
        tenants={tenants}
        activeTenantId={activeTenantId}
        user={user}
        signOutAction={signOutAction}
      />
      <DashboardFiltersBar defaultPreset={defaultPreset} />
      <DashboardNavDrawer pages={pages} />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
