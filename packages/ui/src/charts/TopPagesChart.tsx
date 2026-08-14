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
import type { PageRow } from "@analytics/shared";

type TopPagesChartProps = {
  data: PageRow[];
};

export function TopPagesChart({ data }: TopPagesChartProps) {
  const chartData = data.map((row) => ({
    label: row.pageTitle || row.pagePath,
    pageviews: row.pageviews,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#64748b" }}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={48} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              borderColor: "#e2e8f0",
              fontSize: 12,
            }}
          />
          <Bar dataKey="pageviews" name="Pageviews" fill="#0369a1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
