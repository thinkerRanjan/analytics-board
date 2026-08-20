"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@analytics/shared";
import { formatDuration } from "@analytics/shared";
import { useChartDimensions } from "./useChartDimensions";
import { useChartTheme } from "./useChartTheme";

type TrendChartProps = {
  data: TrendPoint[];
  /** Supports dot paths, e.g. `events.configurator_started`. */
  dataKey?: string;
  label?: string;
  format?: "number" | "duration";
};

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function TrendChart({
  data,
  dataKey = "sessions",
  label = "Sessions",
  format = "number",
}: TrendChartProps) {
  const { containerRef, width, height, ready } = useChartDimensions();
  const theme = useChartTheme();

  // Several trend charts share a page, so the gradient ids have to be unique
  // or every chart resolves to whichever definition rendered first.
  const rawId = useId().replace(/:/g, "");
  const fillId = `trendFill-${rawId}`;
  const strokeId = `trendStroke-${rawId}`;

  const formatValue = (value: number) =>
    format === "duration" ? formatDuration(value) : compact.format(value);

  return (
    <div ref={containerRef} className="h-72 w-full">
      {ready ? (
        <AreaChart
          width={width}
          height={height}
          data={data}
          margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.accent} stopOpacity={0.45} />
              <stop offset="55%" stopColor={theme.accentEnd} stopOpacity={0.18} />
              <stop offset="100%" stopColor={theme.accentEnd} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={theme.accent} />
              <stop offset="100%" stopColor={theme.accentEnd} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 6"
            stroke={theme.grid}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: theme.axis }}
            tickMargin={10}
            minTickGap={28}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: theme.axis }}
            width={format === "duration" ? 62 : 48}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatValue}
          />
          <Tooltip
            cursor={{ stroke: theme.accent, strokeWidth: 1, strokeDasharray: "4 4" }}
            formatter={(value) => [formatValue(Number(value) || 0), label]}
            contentStyle={{
              borderRadius: 10,
              background: theme.tooltip.background,
              border: `1px solid ${theme.tooltip.border}`,
              color: theme.tooltip.color,
              fontSize: 12,
              boxShadow: "0 12px 32px -16px rgba(0,0,0,0.5)",
            }}
            labelStyle={{ color: theme.axis, marginBottom: 4 }}
            itemStyle={{ color: theme.tooltip.color }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            name={label}
            stroke={`url(#${strokeId})`}
            fill={`url(#${fillId})`}
            strokeWidth={2.5}
            connectNulls
            activeDot={{
              r: 4,
              fill: theme.accent,
              stroke: theme.tooltip.background,
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      ) : (
        <div className="skeleton h-full w-full animate-pulse" aria-hidden />
      )}
    </div>
  );
}
