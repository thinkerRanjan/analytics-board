import { BigQuery } from "@google-cloud/bigquery";
import type { TenantConfig } from "@analytics/shared";

let client: BigQuery | null = null;

export function useMockData(): boolean {
  return process.env.USE_MOCK_DATA === "true";
}

export function getBigQueryClient(projectId?: string): BigQuery {
  const credentialsJson = process.env.BIGQUERY_CREDENTIALS_JSON;
  if (credentialsJson) {
    const credentials = JSON.parse(credentialsJson) as {
      client_email: string;
      private_key: string;
      project_id?: string;
    };
    return new BigQuery({
      projectId: projectId ?? credentials.project_id,
      credentials,
    });
  }

  if (!client) {
    client = new BigQuery({
      projectId: projectId,
    });
  }

  // Prefer a project-scoped client when tenant project differs
  if (projectId) {
    return new BigQuery({ projectId });
  }
  return client;
}

export async function runQuery<T extends Record<string, unknown>>(
  tenant: TenantConfig,
  sql: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const bq = getBigQueryClient(tenant.bigquery.projectId);
  const [rows] = await bq.query({
    query: sql,
    params,
    location: tenant.bigquery.location ?? "US",
  });
  return rows as T[];
}

export async function healthCheckBigQuery(tenant: TenantConfig): Promise<{
  ok: boolean;
  message: string;
  mock: boolean;
  tenantId: string;
}> {
  if (useMockData()) {
    return {
      ok: true,
      message: "Using mock data (BigQuery not required)",
      mock: true,
      tenantId: tenant.id,
    };
  }

  try {
    const rows = await runQuery<{ ping: number }>(tenant, "SELECT 1 AS ping");
    return {
      ok: rows[0]?.ping === 1,
      message: `BigQuery OK for ${tenant.bigquery.projectId}.${tenant.bigquery.dataset}`,
      mock: false,
      tenantId: tenant.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, message, mock: false, tenantId: tenant.id };
  }
}
