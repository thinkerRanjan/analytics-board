"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import type { BreakdownRow } from "@analytics/shared";
import { useChartDimensions } from "./useChartDimensions";
import { useChartTheme } from "./useChartTheme";

type DonutChartProps = {
  data: BreakdownRow[];
  valueLabel?: string;
};

const full = new Intl.NumberFormat("en");
const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function DonutChart({ data, valueLabel = "Users" }: DonutChartProps) {
  const { containerRef, width, height, ready } = useChartDimensions();
  const theme = useChartTheme();

  const total = data.reduce((sum, row) => sum + row.value, 0);
  const radius = Math.max(56, Math.min(height, width) / 2 - 12);

  return (
    <div className="flex h-72 w-full items-center gap-5">
      <div ref={containerRef} className="relative h-full min-w-0 flex-1">
        {ready ? (
          <>
            <PieChart width={width} height={height}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={radius * 0.62}
                outerRadius={radius}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((row, index) => (
                  <Cell
                    key={row.label}
                    fill={theme.series[index % theme.series.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [full.format(Number(value) || 0), valueLabel]}
                contentStyle={{
                  borderRadius: 10,
                  background: theme.tooltip.background,
                  border: `1px solid ${theme.tooltip.border}`,
                  color: theme.tooltip.color,
                  fontSize: 12,
                }}
                labelStyle={{ color: theme.axis, marginBottom: 4 }}
                itemStyle={{ color: theme.tooltip.color }}
              />
            </PieChart>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                Total
              </span>
              <span className="text-xl font-semibold tabular-nums text-foreground">
                {compact.format(total)}
              </span>
            </div>
          </>
        ) : (
          <div className="skeleton h-full w-full animate-pulse" aria-hidden />
        )}
      </div>

      <ul className="flex w-40 shrink-0 flex-col gap-2">
        {data.map((row, index) => (
          <li key={row.label} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: theme.series[index % theme.series.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-foreground-soft">
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {total > 0 ? `${Math.round((row.value / total) * 100)}%` : "0%"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
