import type {
  CommentaryReport,
  InsightReport,
} from "./commentary";
import type {
  OverviewMetrics,
  ProductModel,
} from "./metrics";
import type { DashboardPage, NarrativeSection, TenantConfig } from "./tenant";

export type PageMetricsResult =
  | {
      kind: "metrics";
      pageId: string;
      data: OverviewMetrics;
    }
  | {
      kind: "narrative";
      pageId: string;
      sections: NarrativeSection[];
    }
  | {
      kind: "productIndex";
      pageId: string;
      models: ProductModel[];
      mock: boolean;
    }
  | {
      kind: "aiCommentary";
      pageId: string;
      report: CommentaryReport;
    }
  | {
      kind: "aiInsights";
      pageId: string;
      report: InsightReport;
    };

export type FullReportModelSection = {
  model: string;
  data?: OverviewMetrics;
  error?: string;
};

export type FullReportPageSection = {
  page: DashboardPage;
  result?: PageMetricsResult;
  error?: string;
  models?: FullReportModelSection[];
};

export type ReportBrand = NonNullable<TenantConfig["brand"]>;

export type FullDashboardReport = {
  tenantName: string;
  tenantLogo?: string;
  dashboardTitle: string;
  brand?: ReportBrand;
  start: string;
  end: string;
  generatedAt: string;
  mock: boolean;
  sections: FullReportPageSection[];
};
