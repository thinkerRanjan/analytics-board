import type { NarrativeSection, OverviewMetrics, TenantConfig } from "@analytics/shared";
import { getDashboardPage } from "@analytics/shared";
import { fetchOverviewMetrics } from "./metrics";

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

  const data = await fetchOverviewMetrics(tenant, start, end);
  return {
    kind: "metrics",
    pageId,
    data,
  };
}
