import { auth, signOut } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { getTenant } from "@analytics/backend";
import { TenantSwitcher } from "@analytics/ui";
import { redirect } from "next/navigation";

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
  try {
    const tenant = await resolveActiveTenant(session);
    activeTenantName = tenant.name;
    activeTenantId = tenant.id;
  } catch {
    redirect("/login?error=AccessDenied");
  }

  const tenantOptions = session.tenantIds.map((id) => {
    const t = getTenant(id);
    return { id: t.id, name: t.name };
  });

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-teal-800">{activeTenantName}</p>
            <p className="text-xs text-slate-500">GA4 · BigQuery</p>
          </div>
          <div className="flex items-center gap-3">
            <TenantSwitcher
              tenants={tenantOptions}
              activeTenantId={activeTenantId}
            />
            <span className="hidden text-sm text-slate-600 sm:inline">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
