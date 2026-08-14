"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricId, TrendPoint } from "@analytics/shared";

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

export function TrendChart({ data, metric = "sessions" }: TrendChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickMargin={8}
            minTickGap={28}
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={48} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              borderColor: "#e2e8f0",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey={metric}
            name={LABELS[metric]}
            stroke="#0f766e"
            fill="url(#metricFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
