"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type TenantOption = {
  id: string;
  name: string;
};

type TenantSwitcherProps = {
  tenants: TenantOption[];
  activeTenantId: string;
};

export function TenantSwitcher({ tenants, activeTenantId }: TenantSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (tenants.length <= 1) {
    return null;
  }

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Client</span>
      <select
        className="field"
        value={activeTenantId}
        disabled={pending}
        onChange={(e) => {
          const tenantId = e.target.value;
          startTransition(async () => {
            await fetch("/api/tenant/switch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tenantId }),
            });
            router.refresh();
          });
        }}
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
    </label>
  );
}
