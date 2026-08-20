import type {
  EngagementPoint,
  NarrativeSection,
  OverviewMetrics,
  TenantConfig,
  TrendPoint,
} from "@analytics/shared";
import {
  getDashboardPage,
  getPageDimensions,
  getPageEventNames,
  pageNeedsEngagementMetrics,
} from "@analytics/shared";
import { fetchOverviewMetrics } from "./metrics";
import { fetchEngagementDaily } from "./engagement";
import { fetchAudienceBreakdowns } from "./audience";

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
    };

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

  // Engagement and audience each cost an extra scan of the events export, so
  // pages that do not use them (Overview and friends) never pay for them.
  const needsEngagement = pageNeedsEngagementMetrics(page);
  const dimensions = getPageDimensions(page);

  const [data, engagement, breakdowns] = await Promise.all([
    fetchOverviewMetrics(tenant, start, end),
    needsEngagement
      ? fetchEngagementDaily(tenant, start, end, getPageEventNames(page))
      : Promise.resolve<EngagementPoint[]>([]),
    fetchAudienceBreakdowns(tenant, start, end, dimensions),
  ]);

  const merged = engagement.length > 0 ? mergeEngagement(data, engagement) : data;

  return {
    kind: "metrics",
    pageId,
    data:
      dimensions.length > 0 ? { ...merged, breakdowns } : merged,
  };
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
