import { auth, signOut } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { getTenant } from "@analytics/backend";
import {
  DashboardPageHeader,
  Panel,
  TenantSwitcher,
  ThemeToggle,
} from "@analytics/ui";
import { redirect } from "next/navigation";
import { DefaultPresetPreference } from "./DefaultPresetPreference";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let tenant;
  try {
    tenant = await resolveActiveTenant(session);
  } catch {
    redirect("/login?error=AccessDenied");
  }

  const tenantOptions = session.tenantIds.map((id) => {
    const t = getTenant(id);
    return { id: t.id, name: t.name };
  });

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title="Profile settings"
        description="Manage your account, client access, and dashboard preferences."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Account" subtitle="Your signed-in identity">
          <dl className="grid gap-3 text-sm">
            {session.user.name ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  Name
                </dt>
                <dd className="mt-1 text-foreground">{session.user.name}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                Email
              </dt>
              <dd className="mt-1 text-foreground">{session.user.email}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Client" subtitle="Active analytics tenant">
          {tenantOptions.length > 1 ? (
            <TenantSwitcher
              tenants={tenantOptions}
              activeTenantId={tenant.id}
            />
          ) : (
            <p className="text-sm text-foreground">{tenant.name}</p>
          )}
        </Panel>

        <Panel title="Appearance" subtitle="Light, dark, or follow your system">
          <ThemeToggle showLabels />
          <p className="mt-3 text-xs text-muted">
            Saved on this device and applied before the page paints.
          </p>
        </Panel>

        <Panel title="Preferences" subtitle="Default dashboard behaviour">
          <DefaultPresetPreference tenantDefault={tenant.dashboard.defaultPreset} />
        </Panel>

        <Panel title="Notifications" subtitle="Alerts and digests">
          <fieldset disabled className="space-y-3 opacity-70">
            <label className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted">Weekly summary email</span>
              <input type="checkbox" disabled />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted">Anomaly alerts</span>
              <input type="checkbox" disabled />
            </label>
            <p className="text-xs text-muted">Coming soon</p>
          </fieldset>
        </Panel>

        <Panel title="Session" subtitle="Sign out of this device">
          <form action={signOutAction}>
            <button type="submit" className="btn-outline">
              Sign out
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
