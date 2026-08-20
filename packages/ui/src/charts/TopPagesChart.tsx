"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PageRow } from "@analytics/shared";
import { useChartDimensions } from "./useChartDimensions";
import { useChartTheme } from "./useChartTheme";

type TopPagesChartProps = {
  data: PageRow[];
};

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function shorten(label: string): string {
  return label.length > 22 ? `${label.slice(0, 21)}…` : label;
}

export function TopPagesChart({ data }: TopPagesChartProps) {
  const { containerRef, width, height, ready } = useChartDimensions();
  const theme = useChartTheme();

  const chartData = data.map((row) => ({
    label: shorten(row.pageTitle || row.pagePath),
    pageviews: row.pageviews,
  }));

  return (
    <div ref={containerRef} className="h-72 w-full">
      {ready ? (
        <BarChart
          width={width}
          height={height}
          data={chartData}
          margin={{ top: 10, right: 8, left: 0, bottom: 48 }}
          barCategoryGap="30%"
        >
          <defs>
            <linearGradient id="pagesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.accent} stopOpacity={0.95} />
              <stop offset="100%" stopColor={theme.accentEnd} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 6"
            stroke={theme.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: theme.axis }}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={60}
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
            cursor={{ fill: theme.grid, opacity: 0.35 }}
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
          <Bar
            dataKey="pageviews"
            name="Pageviews"
            fill="url(#pagesFill)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      ) : (
        <div className="skeleton h-full w-full animate-pulse" aria-hidden />
      )}
    </div>
  );
}
