"use client";

import { useTheme } from "../ThemeProvider";

export type ChartTheme = {
  grid: string;
  axis: string;
  accent: string;
  accentEnd: string;
  series: string[];
  tooltip: {
    background: string;
    border: string;
    color: string;
  };
};

const LIGHT: ChartTheme = {
  grid: "#e9e9ec",
  axis: "#8b8b96",
  accent: "#c81e2b",
  accentEnd: "#f0637a",
  series: ["#c81e2b", "#7c3aed", "#0891b2", "#ea580c", "#16a34a"],
  tooltip: {
    background: "#ffffff",
    border: "#e4e4e7",
    color: "#18181b",
  },
};

const DARK: ChartTheme = {
  grid: "#26262e",
  axis: "#8c8c99",
  accent: "#f2536a",
  accentEnd: "#a855f7",
  series: ["#f2536a", "#a78bfa", "#22d3ee", "#fb923c", "#4ade80"],
  tooltip: {
    background: "#17171d",
    border: "#2f2f38",
    color: "#f4f4f5",
  },
};

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? DARK : LIGHT;
}
