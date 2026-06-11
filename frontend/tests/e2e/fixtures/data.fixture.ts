import type { Page, APIRequestContext } from '@playwright/test';

const API_BASE = process.env.VITE_BACKEND_URL || 'http://localhost:8000/api/v1';

/**
 * Get the access token from localStorage set by auth.fixture.
 */
async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('access_token'));
}

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Seed a datasource via API and return its data.
 */
export async function seedDatasource(
  request: APIRequestContext,
  page: Page,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; name: string }> {
  const token = await getAuthToken(page);
  const response = await request.post(`${API_BASE}/datasources`, {
    headers: authHeaders(token),
    data: {
      name: overrides.name || `E2E DS ${Date.now()}`,
      type: (overrides.type as string) || 'postgres',
      connection_config: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_pass',
      },
      ...overrides,
    },
  });

  if (!response.ok()) {
    const body = await response.json();
    throw new Error(`Failed to seed datasource: ${body.message || response.status()}`);
  }

  const body = await response.json();
  return body.data as { id: string; name: string };
}

/**
 * Seed a pipeline via API and return its data.
 */
export async function seedPipeline(
  request: APIRequestContext,
  page: Page,
  dataSourceId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; name: string }> {
  const token = await getAuthToken(page);
  const response = await request.post(`${API_BASE}/pipelines`, {
    headers: authHeaders(token),
    data: {
      name: overrides.name || `E2E Pipeline ${Date.now()}`,
      type: (overrides.type as string) || 'volume',
      data_source_id: dataSourceId,
      schedule: null,
      config: overrides.config || { target_table: 'orders' },
      enabled: overrides.enabled !== undefined ? overrides.enabled : true,
      ...overrides,
    },
  });

  if (!response.ok()) {
    const body = await response.json();
    throw new Error(`Failed to seed pipeline: ${body.message || response.status()}`);
  }

  const body = await response.json();
  return body.data as { id: string; name: string };
}

/**
 * Seed an anomaly via API and return its data.
 */
export async function seedAnomaly(
  request: APIRequestContext,
  page: Page,
  pipelineRunId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; severity: string }> {
  const token = await getAuthToken(page);
  const response = await request.post(`${API_BASE}/anomalies`, {
    headers: authHeaders(token),
    data: {
      pipeline_run_id: pipelineRunId,
      severity: (overrides.severity as string) || 'high',
      type: (overrides.type as string) || 'volume',
      description: overrides.description || 'E2E test anomaly',
      deviation_details: overrides.deviation_details || {
        z_score: 4.5,
        baseline_mean: 100,
        current_value: 450,
        deviation_pct: 350,
      },
      ...overrides,
    },
  });

  if (!response.ok()) {
    const body = await response.json();
    throw new Error(`Failed to seed anomaly: ${body.message || response.status()}`);
  }

  const body = await response.json();
  return body.data as { id: string; severity: string };
}

/**
 * Clean up seeded data by deleting entities via API.
 */
export async function cleanupDatasource(
  request: APIRequestContext,
  page: Page,
  datasourceId: string,
): Promise<void> {
  const token = await getAuthToken(page);
  await request.delete(`${API_BASE}/datasources/${datasourceId}`, {
    headers: authHeaders(token),
  });
  // Ignore errors — best-effort cleanup
}

export async function cleanupPipeline(
  request: APIRequestContext,
  page: Page,
  pipelineId: string,
): Promise<void> {
  const token = await getAuthToken(page);
  await request.delete(`${API_BASE}/pipelines/${pipelineId}`, {
    headers: authHeaders(token),
  });
  // Ignore errors — best-effort cleanup
}
