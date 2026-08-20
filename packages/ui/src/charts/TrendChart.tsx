"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricId, TrendPoint } from "@analytics/shared";
import { useChartDimensions } from "./useChartDimensions";
import { useChartTheme } from "./useChartTheme";

type TrendChartProps = {
  data: TrendPoint[];
  metric?: MetricId;
};

const LABELS: Record<MetricId, string> = {
  sessions: "Sessions",
  users: "Users",
  pageviews: "Pageviews",
  conversions: "Conversions",
};

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function TrendChart({ data, metric = "sessions" }: TrendChartProps) {
  const { containerRef, width, height, ready } = useChartDimensions();
  const theme = useChartTheme();

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
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.accent} stopOpacity={0.45} />
              <stop offset="55%" stopColor={theme.accentEnd} stopOpacity={0.18} />
              <stop offset="100%" stopColor={theme.accentEnd} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
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
            width={48}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => compact.format(value)}
          />
          <Tooltip
            cursor={{ stroke: theme.accent, strokeWidth: 1, strokeDasharray: "4 4" }}
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
            dataKey={metric}
            name={LABELS[metric]}
            stroke="url(#trendStroke)"
            fill="url(#trendFill)"
            strokeWidth={2.5}
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
