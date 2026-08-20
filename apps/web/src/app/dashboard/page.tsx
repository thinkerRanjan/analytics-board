import { auth } from "@/lib/auth";
import { resolveActiveTenant } from "@/lib/tenant-session";
import { getDefaultPageId } from "@analytics/shared";
import { redirect } from "next/navigation";

type DashboardIndexProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardIndexPage({
  searchParams,
}: DashboardIndexProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let defaultPageId = "overview";
  try {
    const tenant = await resolveActiveTenant(session);
    defaultPageId = getDefaultPageId(tenant);
  } catch {
    redirect("/login?error=AccessDenied");
  }

  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    }
  }

  const suffix = query.toString();
  redirect(suffix ? `/dashboard/${defaultPageId}?${suffix}` : `/dashboard/${defaultPageId}`);
}
