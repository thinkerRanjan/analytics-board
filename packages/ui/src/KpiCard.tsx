type KpiCardProps = {
  label: string;
  value: number;
  format?: "number" | "compact";
};

function formatValue(value: number, format: "number" | "compact"): string {
  if (format === "compact") {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en").format(value);
}

export function KpiCard({ label, value, format = "number" }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {formatValue(value, format)}
      </p>
    </div>
  );
}
