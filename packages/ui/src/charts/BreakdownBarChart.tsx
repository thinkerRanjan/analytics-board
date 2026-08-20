"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BreakdownRow } from "@analytics/shared";
import { useChartDimensions } from "./useChartDimensions";
import { useChartTheme } from "./useChartTheme";

type BreakdownBarChartProps = {
  data: BreakdownRow[];
  valueLabel?: string;
};

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function shorten(label: string): string {
  return label.length > 20 ? `${label.slice(0, 19)}…` : label;
}

export function BreakdownBarChart({
  data,
  valueLabel = "Users",
}: BreakdownBarChartProps) {
  const { containerRef, width, height, ready } = useChartDimensions();
  const theme = useChartTheme();

  const chartData = data.map((row) => ({
    label: shorten(row.label),
    fullLabel: row.label,
    value: row.value,
  }));

  return (
    <div ref={containerRef} className="h-72 w-full">
      {ready ? (
        <BarChart
          width={width}
          height={height}
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
          barCategoryGap="26%"
        >
          <CartesianGrid
            strokeDasharray="4 6"
            stroke={theme.grid}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: theme.axis }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => compact.format(value)}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={122}
            tick={{ fontSize: 11, fill: theme.axis }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: theme.grid, opacity: 0.35 }}
            formatter={(value) => [
              new Intl.NumberFormat("en").format(Number(value) || 0),
              valueLabel,
            ]}
            labelFormatter={(_label, payload) =>
              payload?.[0]?.payload?.fullLabel ?? _label
            }
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
          <Bar dataKey="value" name={valueLabel} radius={[0, 6, 6, 0]}>
            {chartData.map((row, index) => (
              <Cell
                key={row.fullLabel}
                fill={theme.series[index % theme.series.length]}
              />
            ))}
          </Bar>
        </BarChart>
      ) : (
        <div className="skeleton h-full w-full animate-pulse" aria-hidden />
      )}
    </div>
  );
}
