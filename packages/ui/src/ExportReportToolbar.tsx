"use client";

import Link from "next/link";
import { PrintReportButton } from "./PrintReportButton";

type ExportReportToolbarProps = {
  backHref: string;
  printTitle: string;
};

export function ExportReportToolbar({
  backHref,
  printTitle,
}: ExportReportToolbarProps) {
  return (
    <div className="export-toolbar sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={backHref} className="btn-quiet">
          Back to dashboard
        </Link>
        <PrintReportButton title={printTitle} />
      </div>
    </div>
  );
}
