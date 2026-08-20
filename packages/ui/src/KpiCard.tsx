import type { MetricId } from "@analytics/shared";

type KpiCardProps = {
  label: string;
  value: number;
  metric?: MetricId;
  spark?: number[];
  format?: "number" | "compact";
};

const ICONS: Record<MetricId, React.ReactNode> = {
  sessions: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16.5l4.5-5 3.5 3.5L20 7"
    />
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path
        strokeLinecap="round"
        d="M3.5 19a5.5 5.5 0 0111 0M16 6.2a3 3 0 010 5.6M17.5 19a5 5 0 00-2-4"
      />
    </>
  ),
  pageviews: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z"
      />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  conversions: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.5l2 2 4.5-4.5M12 3.5l2.6 1.6 3 .2.9 2.9 2 2.3-1.4 2.7.3 3-2.8 1.1-1.9 2.3-2.7-.9-2.7.9-1.9-2.3-2.8-1.1.3-3L5.5 8.2l.9-2.9 3-.2z"
    />
  ),
};

const TINTS: Record<MetricId, { bg: string; fg: string }> = {
  sessions: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  users: { bg: "rgba(124, 58, 237, 0.14)", fg: "#8b5cf6" },
  pageviews: { bg: "rgba(8, 145, 178, 0.14)", fg: "#06b6d4" },
  conversions: { bg: "rgba(234, 88, 12, 0.14)", fg: "#f97316" },
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

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;

  const width = 96;
  const height = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;

  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-24 shrink-0"
      preserveAspectRatio="none"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  metric = "sessions",
  spark,
  format = "number",
}: KpiCardProps) {
  const tint = TINTS[metric];

  return (
    <div className="kpi-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <span
          className="kpi-chip"
          style={
            { "--chip-bg": tint.bg, "--chip-fg": tint.fg } as React.CSSProperties
          }
        >
          <svg
            aria-hidden
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            {ICONS[metric]}
          </svg>
        </span>
        {spark && spark.length > 1 ? (
          <Sparkline points={spark} color={tint.fg} />
        ) : null}
      </div>

      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {formatValue(value, format)}
      </p>
    </div>
  );
}
