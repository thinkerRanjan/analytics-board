export {
  loadTenants,
  getTenant,
  listTenants,
  clearTenantCache,
} from "./tenants/registry";
export {
  emailMatchesTenant,
  resolveTenantsForEmail,
  assertTenantAccess,
  pickDefaultTenantId,
} from "./tenants/access";
export {
  useMockData,
  getBigQueryClient,
  runQuery,
  healthCheckBigQuery,
} from "./bigquery";
export { fetchOverviewMetrics } from "./metrics";
export { fetchEngagementDaily } from "./engagement";
export { fetchAudienceBreakdowns } from "./audience";
export { fetchEventBreakdowns } from "./event-breakdowns";
export {
  fetchProductModels,
  fetchModelEventDaily,
} from "./product-models";
export {
  fetchPageMetrics,
  fetchProductModelMetrics,
  fetchFullDashboardReport,
} from "./page-metrics";
export { fetchCommentary, fetchInsights } from "./commentary";
export type { PageMetricsResult } from "./page-metrics";
export {
  getMockOverview,
  getMockEngagement,
  getMockBreakdowns,
  getMockEventBreakdowns,
  getMockProductModels,
} from "./mock-data";
