"use client";

import type { GroupedBreakdownRow } from "@analytics/shared";
import { useChartTheme } from "./useChartTheme";

type GroupedBreakdownChartProps = {
  rows: GroupedBreakdownRow[];
  /** Rows kept per group. */
  limit?: number;
  valueLabel?: string;
};

const full = new Intl.NumberFormat("en");

type Group = {
  name: string;
  total: number;
  rows: GroupedBreakdownRow[];
};

function toGroups(rows: GroupedBreakdownRow[], limit: number): Group[] {
  const byGroup = new Map<string, GroupedBreakdownRow[]>();
  for (const row of rows) {
    const name = row.group ?? "All";
    const bucket = byGroup.get(name);
    if (bucket) bucket.push(row);
    else byGroup.set(name, [row]);
  }

  return [...byGroup.entries()]
    .map(([name, groupRows]) => {
      const sorted = [...groupRows].sort((a, b) => b.value - a.value);
      return {
        name,
        // Total spans every row, not just the ones shown, so the header count
        // stays truthful when a group is trimmed by the limit.
        total: sorted.reduce((sum, row) => sum + row.value, 0),
        rows: sorted.slice(0, limit),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function GroupedBreakdownChart({
  rows,
  limit = 6,
  valueLabel = "Events",
}: GroupedBreakdownChartProps) {
  const theme = useChartTheme();
  const groups = toGroups(rows, limit);

  // Bars are normally scaled within their own group so a small group still
  // shows a readable spread. That breaks down when each group shows a single
  // row, since every bar would sit at 100%, so those scale across all groups
  // instead and become comparable.
  const singleRowPerGroup = groups.every((group) => group.rows.length <= 1);
  const globalMax = Math.max(...groups.map((group) => group.rows[0]?.value ?? 0), 0);

  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => {
        const max = singleRowPerGroup ? globalMax : (group.rows[0]?.value ?? 0);

        return (
          <section key={group.name} className="min-w-0">
            <header className="mb-2.5 flex items-baseline justify-between gap-2 border-b border-border pb-1.5">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {group.name}
              </h3>
              <span
                className="shrink-0 text-[11px] tabular-nums text-muted"
                title={`${full.format(group.total)} ${valueLabel.toLowerCase()}`}
              >
                {full.format(group.total)}
              </span>
            </header>

            <ol className="flex flex-col gap-2">
              {group.rows.map((row, index) => (
                <li key={row.label} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span
                      className={`truncate ${
                        index === 0
                          ? "font-medium text-foreground"
                          : "text-foreground-soft"
                      }`}
                      title={row.label}
                    >
                      {row.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {full.format(row.value)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: max > 0 ? `${(row.value / max) * 100}%` : "0%",
                        background:
                          index === 0
                            ? theme.accent
                            : theme.series[index % theme.series.length],
                        opacity: index === 0 ? 1 : 0.75,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
