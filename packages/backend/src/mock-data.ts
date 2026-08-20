import { eachDayOfInterval, parseISO, format } from "date-fns";
import type {
  AudienceBreakdowns,
  AudienceDimension,
  EngagementPoint,
  EventBreakdowns,
  EventBreakdownSpec,
  OverviewMetrics,
} from "@analytics/shared";
import { eventBreakdownKey } from "@analytics/shared";

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getMockEngagement(
  tenantId: string,
  start: string,
  end: string,
  eventNames: string[] = [],
): EngagementPoint[] {
  const days = eachDayOfInterval({
    start: parseISO(start),
    end: parseISO(end),
  });

  return days.map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const seed = hash(`${tenantId}:${date}`);
    const activeUsers = 110 + (seed % 90);

    return {
      date,
      activeUsers,
      newUsers: Math.round(activeUsers * (0.7 + (seed % 20) / 100)),
      avgSessionSeconds: 90 + (seed % 150),
      events: Object.fromEntries(
        eventNames.map((name) => [
          name,
          20 + (hash(`${name}:${date}`) % 200),
        ]),
      ),
    };
  });
}

const MOCK_DIMENSION_LABELS: Record<AudienceDimension, string[]> = {
  country: ["India", "United States", "United Arab Emirates", "Germany", "United Kingdom"],
  region: ["Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat", "Telangana"],
  city: ["Bengaluru", "Mumbai", "Chennai", "Delhi", "Hyderabad", "Pune"],
  deviceCategory: ["mobile", "desktop", "tablet"],
  operatingSystem: ["Android", "Windows", "iOS", "Macintosh", "Linux"],
  browser: ["Chrome", "Safari", "Edge", "Firefox", "Opera"],
  language: ["en-in", "en-us", "en-gb", "en-ca"],
  userType: ["New", "Returning"],
};

export function getMockBreakdowns(
  tenantId: string,
  start: string,
  end: string,
  dimensions: AudienceDimension[],
): AudienceBreakdowns {
  const seed = hash(`${tenantId}:${start}:${end}`);

  return Object.fromEntries(
    dimensions.map((dimension) => {
      const labels = MOCK_DIMENSION_LABELS[dimension];
      const rows = labels.map((label, index) => ({
        label,
        value: Math.round(
          (4000 + (hash(`${dimension}:${label}`) % 2000)) / (index + 1.4) +
            (seed % 50),
        ),
      }));
      return [dimension, rows.sort((a, b) => b.value - a.value)];
    }),
  );
}

const MOCK_MODELS = ["New Slavia", "Kylaq", "New Kushaq", "Slavia", "Octavia"];

const MOCK_PARAM_VALUES: Record<string, string[]> = {
  model: MOCK_MODELS,
  variant: [
    "Monte Carlo AT",
    "Prestige AT",
    "Signature+ AT",
    "Classic MT",
    "Sportline AT",
  ],
  color: [
    "Deep Black",
    "Lava Blue",
    "Brilliant Silver",
    "Candy White",
    "Cherry Red",
  ],
};

export function getMockEventBreakdowns(
  tenantId: string,
  specs: EventBreakdownSpec[],
): EventBreakdowns {
  return Object.fromEntries(
    specs.map((spec) => {
      const labels = MOCK_PARAM_VALUES[spec.param] ?? ["(not set)"];
      const groups = spec.groupBy
        ? (MOCK_PARAM_VALUES[spec.groupBy] ?? MOCK_MODELS)
        : [null];

      const rows = groups.flatMap((group) =>
        labels.map((label, index) => ({
          group,
          label,
          value: Math.round(
            (2500 + (hash(`${tenantId}:${group}:${label}`) % 1500)) /
              (index + 1.3),
          ),
        })),
      );

      return [eventBreakdownKey(spec), rows.sort((a, b) => b.value - a.value)];
    }),
  );
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
