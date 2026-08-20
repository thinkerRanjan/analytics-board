export type TrendPoint = {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
  conversions: number;
  /** Distinct users with at least one engaged session that day. */
  activeUsers?: number;
  /** Distinct users whose first_visit landed that day. */
  newUsers?: number;
  /** Mean engagement time per session, in seconds. */
  avgSessionSeconds?: number;
  /** Daily counts keyed by raw GA4 event name. */
  events?: Record<string, number>;
};

export type EngagementPoint = {
  date: string;
  activeUsers: number;
  newUsers: number;
  avgSessionSeconds: number;
  events: Record<string, number>;
};

/** Renders a seconds value as `1h 04m`, `2m 14s`, or `43s`. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(secs).padStart(2, "0")}s`;
  return `${secs}s`;
}

export type SourceRow = {
  source: string;
  medium: string;
  sessions: number;
};

export type PageRow = {
  pagePath: string;
  pageTitle: string;
  pageviews: number;
};

export type BreakdownRow = {
  label: string;
  value: number;
};

/** Keyed by AudienceDimension; only the dimensions a page asks for are present. */
export type AudienceBreakdowns = Record<string, BreakdownRow[]>;

/** A ranked row, optionally scoped to a group such as a car model. */
export type GroupedBreakdownRow = BreakdownRow & {
  group: string | null;
};

/** Keyed by `eventBreakdownKey`. */
export type EventBreakdowns = Record<string, GroupedBreakdownRow[]>;

export type OverviewMetrics = {
  start: string;
  end: string;
  mock: boolean;
  tenantId: string;
  kpis: {
    sessions: number;
    users: number;
    pageviews: number;
    conversions: number;
  };
  trend: TrendPoint[];
  sources: SourceRow[];
  pages: PageRow[];
  breakdowns?: AudienceBreakdowns;
  eventBreakdowns?: EventBreakdowns;
};
