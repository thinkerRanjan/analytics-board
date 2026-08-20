import { auth, signOut } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { getTenant } from "@analytics/backend";
import { getDashboardNavItems } from "@analytics/shared";
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
  let activeTenantId = session.tenantId ?? session.tenantIds[0] ?? "";
  let dashboardTitle = "Analytics Board";
  let defaultPreset: "7d" | "28d" | "90d" = "28d";
  let navPages: ReturnType<typeof getDashboardNavItems> = [];

  try {
    const tenant = await resolveActiveTenant(session);
    activeTenantName = tenant.name;
    activeTenantId = tenant.id;
    dashboardTitle = tenant.dashboard.title;
    defaultPreset = tenant.dashboard.defaultPreset;
    navPages = getDashboardNavItems(tenant);
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
