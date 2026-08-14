export type TrendPoint = {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
  conversions: number;
};

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
};
