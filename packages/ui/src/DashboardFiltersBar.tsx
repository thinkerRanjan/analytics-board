"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { parseDateRange } from "@analytics/shared";
import { useSearchParams } from "next/navigation";
import { DateRangePicker } from "./DateRangePicker";
import { getStoredDefaultPreset } from "./preferences";

function DateRangePickerInner({
  defaultPreset,
}: {
  defaultPreset: "7d" | "28d" | "90d";
}) {
  const searchParams = useSearchParams();
  const [storedPreset, setStoredPreset] = useState<"7d" | "28d" | "90d" | null>(
    null,
  );

  useEffect(() => {
    setStoredPreset(getStoredDefaultPreset());
  }, []);

  const urlPreset = searchParams.get("preset");
  const fallbackPreset = storedPreset ?? defaultPreset;
  const range = parseDateRange(
    searchParams.get("start") ?? undefined,
    searchParams.get("end") ?? undefined,
    urlPreset ?? fallbackPreset,
  );

  const href =
    range.preset === "custom"
      ? `/dashboard/export?preset=custom&start=${range.start}&end=${range.end}`
      : `/dashboard/export?preset=${range.preset}`;

  return (
    <>
      <DateRangePicker start={range.start} end={range.end} preset={range.preset} />
      <Link href={href} className="btn-outline px-3 py-1.5 text-sm">
        Export PDF
      </Link>
    </>
  );
}

export function DashboardFiltersBar({
  defaultPreset,
}: {
  defaultPreset: "7d" | "28d" | "90d";
}) {
  // Date range + export share one Suspense boundary so the PDF link
  // always uses the same resolved range as the picker.
  return (
    <div className="shell-subbar">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
          Date range
        </p>
        <Suspense
          fallback={<div className="skeleton h-9 w-64 animate-pulse" />}
        >
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePickerInner defaultPreset={defaultPreset} />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
