"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SourceRow } from "@analytics/shared";

type SourceBreakdownChartProps = {
  data: SourceRow[];
};

export function SourceBreakdownChart({ data }: SourceBreakdownChartProps) {
  const chartData = data.map((row) => ({
    label: `${row.source} / ${row.medium}`,
    sessions: row.sessions,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              borderColor: "#e2e8f0",
              fontSize: 12,
            }}
          />
          <Bar dataKey="sessions" name="Sessions" fill="#0e7490" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
