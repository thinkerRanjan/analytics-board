import { eachDayOfInterval, parseISO, format } from "date-fns";
import type { OverviewMetrics } from "@analytics/shared";

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getMockOverview(
  tenantId: string,
  start: string,
  end: string,
): OverviewMetrics {
  const seedOffset = hash(tenantId) % 200;
  const days = eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  });

  const trend = days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const seed = hash(`${tenantId}:${key}`);
    const sessions = 600 + seedOffset + (seed % 500);
    const users = Math.round(sessions * (0.65 + (seed % 20) / 100));
    const pageviews = Math.round(sessions * (2.1 + (seed % 15) / 10));
    const conversions = Math.round(sessions * (0.02 + (seed % 10) / 1000));
    return { date: key, sessions, users, pageviews, conversions };
  });

  const totals = trend.reduce(
    (acc, row) => ({
      sessions: acc.sessions + row.sessions,
      users: acc.users + row.users,
      pageviews: acc.pageviews + row.pageviews,
      conversions: acc.conversions + row.conversions,
    }),
    { sessions: 0, users: 0, pageviews: 0, conversions: 0 },
  );

  return {
    start,
    end,
    mock: true,
    tenantId,
    kpis: totals,
    trend,
    sources: [
      { source: "google", medium: "organic", sessions: Math.round(totals.sessions * 0.38) },
      { source: "direct", medium: "(none)", sessions: Math.round(totals.sessions * 0.24) },
      { source: "newsletter", medium: "email", sessions: Math.round(totals.sessions * 0.14) },
      { source: "linkedin", medium: "social", sessions: Math.round(totals.sessions * 0.12) },
      { source: "bing", medium: "organic", sessions: Math.round(totals.sessions * 0.07) },
      { source: "other", medium: "referral", sessions: Math.round(totals.sessions * 0.05) },
    ],
    pages: [
      { pagePath: "/", pageTitle: "Home", pageviews: Math.round(totals.pageviews * 0.28) },
      { pagePath: "/pricing", pageTitle: "Pricing", pageviews: Math.round(totals.pageviews * 0.16) },
      { pagePath: "/docs", pageTitle: "Docs", pageviews: Math.round(totals.pageviews * 0.14) },
      { pagePath: "/blog", pageTitle: "Blog", pageviews: Math.round(totals.pageviews * 0.12) },
      { pagePath: "/product", pageTitle: "Product", pageviews: Math.round(totals.pageviews * 0.1) },
      { pagePath: "/login", pageTitle: "Login", pageviews: Math.round(totals.pageviews * 0.08) },
      { pagePath: "/about", pageTitle: "About", pageviews: Math.round(totals.pageviews * 0.06) },
      { pagePath: "/contact", pageTitle: "Contact", pageviews: Math.round(totals.pageviews * 0.06) },
    ],
  };
}
