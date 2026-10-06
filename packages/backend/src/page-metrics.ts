import type {
  DashboardPage,
  EngagementPoint,
  FullDashboardReport,
  FullReportModelSection,
  FullReportPageSection,
  OverviewMetrics,
  PageMetricsResult,
  TenantConfig,
  TrendPoint,
} from "@analytics/shared";
import {
  getDashboardPage,
  getPageDimensions,
  getPageEventBreakdowns,
  getPageEventNames,
  pageNeedsEngagementMetrics,
  scopedEventBreakdowns,
  type ProductIndexPage,
} from "@analytics/shared";
import { fetchOverviewMetrics } from "./metrics";
import { fetchEngagementDaily } from "./engagement";
import { fetchAudienceBreakdowns } from "./audience";
import { fetchEventBreakdowns } from "./event-breakdowns";
import { fetchModelEventDaily, fetchProductModels } from "./product-models";
import { fetchCommentary, fetchInsights } from "./commentary";
import { useMockData } from "./bigquery";

export type { PageMetricsResult } from "@analytics/shared";

export async function fetchPageMetrics(
  tenant: TenantConfig,
  pageId: string,
  start: string,
  end: string,
): Promise<PageMetricsResult> {
  const page = getDashboardPage(tenant, pageId);
  if (!page) {
    throw new Error(`Unknown dashboard page: ${pageId}`);
  }

  if (page.kind === "narrative") {
    return {
      kind: "narrative",
      pageId,
      sections: page.sections,
    };
  }

  if (page.kind === "aiCommentary") {
    const report = await fetchCommentary(tenant, start, end);
    return { kind: "aiCommentary", pageId, report };
  }

  if (page.kind === "aiInsights") {
    const report = await fetchInsights(tenant, start, end);
    return { kind: "aiInsights", pageId, report };
  }

  if (page.kind === "productIndex") {
    const models = await fetchProductModels(
      tenant,
      start,
      end,
      page.sourceEvent,
      page.sourceParam,
    );
    return {
      kind: "productIndex",
      pageId,
      models,
      mock: useMockData(),
    };
  }

  // Engagement and audience each cost an extra scan of the events export, so
  // pages that do not use them (Overview and friends) never pay for them.
  const needsEngagement = pageNeedsEngagementMetrics(page);
  const dimensions = getPageDimensions(page);
  const eventSpecs = getPageEventBreakdowns(page);

  const [data, engagement, breakdowns, eventBreakdowns] = await Promise.all([
    fetchOverviewMetrics(tenant, start, end),
    needsEngagement
      ? fetchEngagementDaily(tenant, start, end, getPageEventNames(page))
      : Promise.resolve<EngagementPoint[]>([]),
    fetchAudienceBreakdowns(tenant, start, end, dimensions),
    fetchEventBreakdowns(tenant, start, end, eventSpecs),
  ]);

  let result = engagement.length > 0 ? mergeEngagement(data, engagement) : data;
  if (dimensions.length > 0) result = { ...result, breakdowns };
  if (eventSpecs.length > 0) result = { ...result, eventBreakdowns };

  return { kind: "metrics", pageId, data: result };
}

export async function fetchProductModelMetrics(
  tenant: TenantConfig,
  page: ProductIndexPage,
  model: string,
  start: string,
  end: string,
): Promise<OverviewMetrics> {
  const eventNames = getPageEventNames(page);
  const eventSpecs = scopedEventBreakdowns(page, page.sourceParam, model);

  const [events, eventBreakdowns] = await Promise.all([
    fetchModelEventDaily(
      tenant,
      start,
      end,
      eventNames,
      page.sourceParam,
      model,
    ),
    fetchEventBreakdowns(tenant, start, end, eventSpecs),
  ]);

  const trend: TrendPoint[] = events.map((point) => ({
    date: point.date,
    sessions: 0,
    users: 0,
    pageviews: 0,
    conversions: 0,
    events: point.events,
  }));

  return {
    start,
    end,
    mock: useMockData(),
    tenantId: tenant.id,
    kpis: { sessions: 0, users: 0, pageviews: 0, conversions: 0 },
    trend,
    sources: [],
    pages: [],
    eventBreakdowns,
  };
}

export type {
  FullDashboardReport,
  FullReportModelSection,
  FullReportPageSection,
} from "@analytics/shared";

export async function fetchFullDashboardReport(
  tenant: TenantConfig,
  start: string,
  end: string,
): Promise<FullDashboardReport> {
  const sections = await Promise.all(
    tenant.dashboard.pages.map((page) =>
      fetchReportPageSection(tenant, page, start, end),
    ),
  );

  const mock = sections.some((section) => {
    if (section.result?.kind === "metrics") return section.result.data.mock;
    if (section.result?.kind === "productIndex") return section.result.mock;
    if (
      section.result?.kind === "aiCommentary" ||
      section.result?.kind === "aiInsights"
    ) {
      return section.result.report.mock;
    }
    return section.models?.some((model) => model.data?.mock) ?? false;
  });

  return {
    tenantName: tenant.name,
    tenantLogo: tenant.logo,
    dashboardTitle: tenant.dashboard.title,
    brand: tenant.brand,
    start,
    end,
    generatedAt: new Date().toISOString(),
    mock,
    sections,
  };
}

async function fetchReportPageSection(
  tenant: TenantConfig,
  page: DashboardPage,
  start: string,
  end: string,
): Promise<FullReportPageSection> {
  try {
    const result = await fetchPageMetrics(tenant, page.id, start, end);
    if (result.kind !== "productIndex" || page.kind !== "productIndex") {
      return { page, result };
    }

    const models = await Promise.all(
      result.models.map((model) =>
        fetchReportModelSection(tenant, page, model.name, start, end),
      ),
    );
    return { page, result, models };
  } catch (err) {
    return {
      page,
      error: err instanceof Error ? err.message : "Failed to load page data",
    };
  }
}

async function fetchReportModelSection(
  tenant: TenantConfig,
  page: ProductIndexPage,
  model: string,
  start: string,
  end: string,
): Promise<FullReportModelSection> {
  try {
    const data = await fetchProductModelMetrics(
      tenant,
      page,
      model,
      start,
      end,
    );
    return { model, data };
  } catch (err) {
    return {
      model,
      error: err instanceof Error ? err.message : "Failed to load model data",
    };
  }
}

function mergeEngagement(
  data: OverviewMetrics,
  engagement: EngagementPoint[],
): OverviewMetrics {
  const byDate = new Map(engagement.map((point) => [point.date, point]));

  // The overview trend drives the x-axis; engagement days outside it are
  // dropped rather than creating points with no session/user context.
  const trend: TrendPoint[] = data.trend.map((point) => {
    const extra = byDate.get(point.date);
    if (!extra) return point;

    return {
      ...point,
      activeUsers: extra.activeUsers,
      newUsers: extra.newUsers,
      avgSessionSeconds: extra.avgSessionSeconds,
      events: extra.events,
    };
  });

  return { ...data, trend };
}
