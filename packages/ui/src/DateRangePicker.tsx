"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { DateRangePreset } from "@analytics/shared";

const PRESETS: { id: Exclude<DateRangePreset, "custom">; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "28d", label: "28 days" },
  { id: "90d", label: "90 days" },
];

type DateRangePickerProps = {
  start: string;
  end: string;
  preset: DateRangePreset;
};

export function DateRangePicker({ start, end, preset }: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (next: { preset?: string; start?: string; end?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.preset && next.preset !== "custom") {
        params.set("preset", next.preset);
        params.delete("start");
        params.delete("end");
      } else {
        params.set("preset", "custom");
        if (next.start) params.set("start", next.start);
        if (next.end) params.set("end", next.end);
      }
      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      startTransition(() => {
        router.push(href);
      });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="segmented" role="group" aria-label="Date range presets">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={pending}
            data-active={preset === p.id}
            onClick={() => update({ preset: p.id })}
            className="segmented-item"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label="Start date"
          value={start}
          disabled={pending}
          onChange={(e) => update({ start: e.target.value, end, preset: "custom" })}
          className="field"
        />
        <span className="text-xs text-muted">to</span>
        <input
          type="date"
          aria-label="End date"
          value={end}
          disabled={pending}
          onChange={(e) => update({ start, end: e.target.value, preset: "custom" })}
          className="field"
        />
      </div>
    </div>
  );
}
