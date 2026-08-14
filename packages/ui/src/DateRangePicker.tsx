"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { DateRangePreset } from "@analytics/shared";

const PRESETS: { id: Exclude<DateRangePreset, "custom">; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "28d", label: "Last 28 days" },
  { id: "90d", label: "Last 90 days" },
];

type DateRangePickerProps = {
  start: string;
  end: string;
  preset: DateRangePreset;
};

export function DateRangePicker({ start, end, preset }: DateRangePickerProps) {
  const router = useRouter();
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
      startTransition(() => {
        router.push(`/dashboard?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Date range presets">
        {PRESETS.map((p) => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={pending}
              onClick={() => update({ preset: p.id })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-teal-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              } disabled:opacity-60`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Start
          <input
            type="date"
            value={start}
            disabled={pending}
            onChange={(e) => update({ start: e.target.value, end, preset: "custom" })}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          End
          <input
            type="date"
            value={end}
            disabled={pending}
            onChange={(e) => update({ start, end: e.target.value, preset: "custom" })}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
          />
        </label>
      </div>
    </div>
  );
}
