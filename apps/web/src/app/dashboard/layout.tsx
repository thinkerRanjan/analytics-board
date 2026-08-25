import { auth, signOut } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { fetchProductModels, getTenant } from "@analytics/backend";
import {
  attachProductModels,
  getDashboardNavItems,
  getProductIndexPage,
  presetToRange,
} from "@analytics/shared";
import { DashboardAppShell } from "@analytics/ui";
import { redirect } from "next/navigation";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let activeTenantName = "Analytics Board";
  let activeTenantLogo: string | undefined;
  let activeTenantId = session.tenantId ?? session.tenantIds[0] ?? "";
  let dashboardTitle = "Analytics Board";
  let defaultPreset: "7d" | "28d" | "90d" = "28d";
  let navPages: ReturnType<typeof getDashboardNavItems> = [];

  try {
    const tenant = await resolveActiveTenant(session);
    activeTenantName = tenant.name;
    activeTenantLogo = tenant.logo;
    activeTenantId = tenant.id;
    dashboardTitle = tenant.dashboard.title;
    defaultPreset = tenant.dashboard.defaultPreset;
    navPages = getDashboardNavItems(tenant);

    const productPage = getProductIndexPage(tenant);
    if (productPage) {
      try {
        const catalog = presetToRange("90d");
        const models = await fetchProductModels(
          tenant,
          catalog.start,
          catalog.end,
          productPage.sourceEvent,
          productPage.sourceParam,
        );
        navPages = attachProductModels(navPages, productPage.id, models);
      } catch {
        // Nav still works without the model list if BigQuery is unavailable.
      }
    }
  } catch {
    redirect("/login?error=AccessDenied");
  }

  const tenantOptions = session.tenantIds.map((id) => {
    const t = getTenant(id);
    return { id: t.id, name: t.name };
  });

  return (
    <DashboardAppShell
      tenantName={activeTenantName}
      tenantLogo={activeTenantLogo}
      dashboardTitle={dashboardTitle}
      pages={navPages}
      tenants={tenantOptions}
      activeTenantId={activeTenantId}
      defaultPreset={defaultPreset}
      user={{
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      }}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardAppShell>
  );
}
