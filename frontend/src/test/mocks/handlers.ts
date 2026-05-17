/**
 * MSW mock API handlers for testing.
 *
 * Each handler intercepts a specific API endpoint and returns mock data,
 * allowing frontend tests to run without a real backend.
 *
 * RED PHASE: Will fail because modules (msw) don't exist yet.
 */

import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:8000/api/v1';

// ============================================================
// Auth handlers
// ============================================================

export const authHandlers = [
  // POST /api/v1/auth/register
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;

    if (!body.email || !body.password) {
      return HttpResponse.json(
        { data: null, error: 'validation_error', message: 'Email and password required' },
        { status: 422 }
      );
    }

    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { data: null, error: 'email_exists', message: 'Email already registered' },
        { status: 409 }
      );
    }

    return HttpResponse.json(
      {
        data: {
          user: {
            id: 'mock-user-uuid',
            email: body.email,
            name: body.name || 'Test User',
          },
          access_token: 'mock-access-token-xxx.yyy.zzz',
          refresh_token: 'mock-refresh-token-xxx.yyy.zzz',
        },
        error: null,
      },
      { status: 201 }
    );
  }),

  // POST /api/v1/auth/login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;

    if (body.email === 'test@example.com' && body.password === 'TestPassword123!') {
      return HttpResponse.json(
        {
          data: {
            user: {
              id: 'mock-user-uuid',
              email: 'test@example.com',
              name: 'Test User',
            },
            access_token: 'mock-access-token-xxx.yyy.zzz',
            refresh_token: 'mock-refresh-token-xxx.yyy.zzz',
          },
          error: null,
        },
        { status: 200 }
      );
    }

    return HttpResponse.json(
      { data: null, error: 'invalid_credentials', message: 'Email ou senha invalidos' },
      { status: 401 }
    );
  }),

  // POST /api/v1/auth/refresh
  http.post(`${API_BASE}/auth/refresh`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;

    if (!body.refresh_token || body.refresh_token === 'invalid.token') {
      return HttpResponse.json(
        { data: null, error: 'invalid_token', message: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    return HttpResponse.json(
      {
        data: {
          access_token: 'mock-new-access-token-xxx.yyy.zzz',
          refresh_token: 'mock-new-refresh-token-xxx.yyy.zzz',
        },
        error: null,
      },
      { status: 200 }
    );
  }),

  // POST /api/v1/auth/logout
  http.post(`${API_BASE}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// ============================================================
// DataSource handlers
// ============================================================

let mockDataSources: Array<{
  id: string;
  name: string;
  type: string;
  connection_config: Record<string, unknown>;
  status: string;
  agent_id: string | null;
  agent: { id: string; name: string; status: string } | null;
  created_at: string;
  updated_at: string;
}> = [
  {
    id: 'ds-uuid-001',
    name: 'Production PostgreSQL',
    type: 'postgres',
    connection_config: { host: 'prod.db', port: 5432 },
    status: 'active',
    agent_id: 'agent-uuid-001',
    agent: { id: 'agent-uuid-001', name: 'Production Agent', status: 'online' },
    created_at: '2026-05-12T00:00:00Z',
    updated_at: '2026-05-12T00:00:00Z',
  },
  {
    id: 'ds-uuid-002',
    name: 'Analytics MySQL',
    type: 'mysql',
    connection_config: { host: 'analytics.db', port: 3306 },
    status: 'active',
    agent_id: 'agent-uuid-002',
    agent: { id: 'agent-uuid-002', name: 'Staging Agent', status: 'offline' },
    created_at: '2026-05-12T01:00:00Z',
    updated_at: '2026-05-12T01:00:00Z',
  },
  {
    id: 'ds-uuid-003',
    name: 'Inactive BigQuery',
    type: 'bigquery',
    connection_config: {},
    status: 'inactive',
    agent_id: null,
    agent: null,
    created_at: '2026-05-11T00:00:00Z',
    updated_at: '2026-05-11T00:00:00Z',
  },
];

export const datasourceHandlers = [
  // GET /api/v1/datasources
  http.get(`${API_BASE}/datasources`, ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '50');

    let filtered = [...mockDataSources];

    if (type) {
      filtered = filtered.filter((ds) => ds.type === type);
    }
    if (status) {
      filtered = filtered.filter((ds) => ds.status === status);
    }

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const pageData = filtered.slice(start, start + perPage);

    return HttpResponse.json(
      {
        data: pageData,
        meta: { page, per_page: perPage, total },
        error: null,
      },
      { status: 200 }
    );
  }),

  // POST /api/v1/datasources
  http.post(`${API_BASE}/datasources`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;

    if (!body.name || !body.type) {
      return HttpResponse.json(
        { data: null, error: 'validation_error', message: 'Name and type are required' },
        { status: 422 }
      );
    }

    const newDs = {
      id: `ds-uuid-${Date.now()}`,
      name: body.name,
      type: body.type,
      connection_config: body.connection_config || {},
      status: body.status || 'active',
      agent_id: body.agent_id || null,
      agent: body.agent_id
        ? { id: body.agent_id, name: 'Mock Agent', status: 'online' }
        : null,
      created_at: '2026-05-12T12:00:00Z',
      updated_at: '2026-05-12T12:00:00Z',
    };

    mockDataSources.push(newDs);

    return HttpResponse.json(
      { data: newDs, error: null },
      { status: 201 }
    );
  }),

  // GET /api/v1/datasources/:id
  http.get(`${API_BASE}/datasources/:id`, ({ params }) => {
    const { id } = params;
    const ds = mockDataSources.find((d) => d.id === id);

    if (!ds) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'DataSource not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(
      { data: ds, error: null },
      { status: 200 }
    );
  }),

  // PUT /api/v1/datasources/:id
  http.put(`${API_BASE}/datasources/:id`, async ({ request, params }) => {
    const { id } = params;
    const body = await request.json() as Record<string, string>;
    const index = mockDataSources.findIndex((d) => d.id === id);

    if (index === -1) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'DataSource not found' },
        { status: 404 }
      );
    }

    mockDataSources[index] = {
      ...mockDataSources[index],
      ...body,
      updated_at: '2026-05-12T13:00:00Z',
    };

    return HttpResponse.json(
      { data: mockDataSources[index], error: null },
      { status: 200 }
    );
  }),

  // DELETE /api/v1/datasources/:id
  http.delete(`${API_BASE}/datasources/:id`, ({ params }) => {
    const { id } = params;
    const index = mockDataSources.findIndex((d) => d.id === id);

    if (index === -1) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'DataSource not found' },
        { status: 404 }
      );
    }

    mockDataSources.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

// ============================================================
// Health handler
// ============================================================

export const healthHandlers = [
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json(
      {
        data: {
          status: 'healthy',
          version: '0.1.0',
          database: 'connected',
          uptime_seconds: 3600,
          timestamp: '2026-05-12T12:00:00Z',
        },
        error: null,
      },
      { status: 200 }
    );
  }),
];

// ============================================================
// Pipeline handlers
// ============================================================

let mockPipelines = [
  {
    id: 'pipe-uuid-001',
    name: 'Daily Volume Check',
    type: 'volume',
    data_source_id: 'ds-uuid-001',
    data_source: { id: 'ds-uuid-001', name: 'Production PostgreSQL' },
    schedule: '0 6 * * *',
    config: { query: 'SELECT COUNT(*) FROM orders', threshold: 1000 },
    enabled: true,
    created_at: '2026-05-12T00:00:00Z',
    updated_at: '2026-05-12T00:00:00Z',
  },
];

export const pipelineHandlers = [
  // GET /api/v1/pipelines
  http.get(`${API_BASE}/pipelines`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '50');

    return HttpResponse.json(
      {
        data: mockPipelines,
        meta: { page, per_page: perPage, total: mockPipelines.length },
        error: null,
      },
      { status: 200 }
    );
  }),

  // POST /api/v1/pipelines
  http.post(`${API_BASE}/pipelines`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newPipe = {
      id: `pipe-uuid-${Date.now()}`,
      ...body,
      created_at: '2026-05-12T12:00:00Z',
      updated_at: '2026-05-12T12:00:00Z',
    } as typeof mockPipelines[0];
    mockPipelines.push(newPipe);

    return HttpResponse.json(
      { data: newPipe, error: null },
      { status: 201 }
    );
  }),

  // GET /api/v1/pipelines/:id
  http.get(`${API_BASE}/pipelines/:id`, ({ params }) => {
    const pipe = mockPipelines.find((p) => p.id === params.id);

    if (!pipe) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'Pipeline not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(
      { data: pipe, error: null },
      { status: 200 }
    );
  }),

  // PUT /api/v1/pipelines/:id
  http.put(`${API_BASE}/pipelines/:id`, async ({ request, params }) => {
    const index = mockPipelines.findIndex((p) => p.id === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'Pipeline not found' },
        { status: 404 }
      );
    }
    const body = await request.json() as Record<string, unknown>;
    mockPipelines[index] = { ...mockPipelines[index], ...body, updated_at: '2026-05-12T13:00:00Z' };
    return HttpResponse.json({ data: mockPipelines[index], error: null }, { status: 200 });
  }),

  // DELETE /api/v1/pipelines/:id
  http.delete(`${API_BASE}/pipelines/:id`, ({ params }) => {
    const index = mockPipelines.findIndex((p) => p.id === params.id);
    if (index === -1) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'Pipeline not found' },
        { status: 404 }
      );
    }
    mockPipelines.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

// ============================================================
// Agent handlers
// ============================================================

let mockAgents: Array<{
  id: string;
  name: string;
  status: string;
  user_id: string;
  last_heartbeat_at: string | null;
  version: string | null;
  created_at: string;
}> = [
  {
    id: 'agent-uuid-001',
    name: 'Production Agent',
    status: 'online',
    user_id: 'mock-user-uuid',
    last_heartbeat_at: '2026-05-12T12:00:00Z',
    version: '0.1.0',
    created_at: '2026-05-12T00:00:00Z',
  },
  {
    id: 'agent-uuid-002',
    name: 'Staging Agent',
    status: 'offline',
    user_id: 'mock-user-uuid',
    last_heartbeat_at: null,
    version: '0.1.0',
    created_at: '2026-05-12T01:00:00Z',
  },
];

export const agentHandlers = [
  // GET /api/v1/agents
  http.get(`${API_BASE}/agents`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '50');

    let filtered = [...mockAgents];

    if (status) {
      filtered = filtered.filter((a) => a.status === status);
    }

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const pageData = filtered.slice(start, start + perPage);

    return HttpResponse.json(
      {
        data: pageData,
        meta: { page, per_page: perPage, total },
        error: null,
      },
      { status: 200 }
    );
  }),

  // POST /api/v1/agents
  http.post(`${API_BASE}/agents`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;

    if (!body.name || !body.name.trim()) {
      return HttpResponse.json(
        { data: null, error: 'validation_error', message: 'Name is required' },
        { status: 422 }
      );
    }

    const newAgent = {
      id: `agent-uuid-${Date.now()}`,
      name: body.name,
      status: body.status || 'offline',
      user_id: 'mock-user-uuid',
      last_heartbeat_at: null,
      version: body.version || null,
      created_at: '2026-05-12T12:00:00Z',
    };

    mockAgents.push(newAgent);

    const generatedToken =
      'beacon_agent_' +
      Array.from({ length: 48 }, () =>
        'abcdefghijklmnopqrstuvwxyz0123456789'[
          Math.floor(Math.random() * 36)
        ]
      ).join('');

    return HttpResponse.json(
      { data: { ...newAgent, agent_token: generatedToken }, error: null },
      { status: 201 }
    );
  }),

  // GET /api/v1/agents/:id
  http.get(`${API_BASE}/agents/:id`, ({ params }) => {
    const { id } = params;
    const agent = mockAgents.find((a) => a.id === id);

    if (!agent) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'Agent not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(
      { data: agent, error: null },
      { status: 200 }
    );
  }),

  // PUT /api/v1/agents/:id
  http.put(`${API_BASE}/agents/:id`, async ({ request, params }) => {
    const { id } = params;
    const body = await request.json() as Record<string, string>;
    const index = mockAgents.findIndex((a) => a.id === id);

    if (index === -1) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'Agent not found' },
        { status: 404 }
      );
    }

    mockAgents[index] = {
      ...mockAgents[index],
      ...body,
    };

    return HttpResponse.json(
      { data: mockAgents[index], error: null },
      { status: 200 }
    );
  }),

  // DELETE /api/v1/agents/:id
  http.delete(`${API_BASE}/agents/:id`, ({ params }) => {
    const { id } = params;
    const index = mockAgents.findIndex((a) => a.id === id);

    if (index === -1) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'Agent not found' },
        { status: 404 }
      );
    }

    mockAgents.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

// ============================================================
// API Key handlers
// ============================================================

export const apiKeyHandlers = [
  http.post(`${API_BASE}/api-keys`, async ({ request }) => {
    const body = await request.json() as Record<string, string>;
    return HttpResponse.json(
      {
        data: {
          id: 'apikey-uuid-001',
          name: body.name || 'Test Key',
          prefix: 'bcn_',
          key: 'bcn_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
          expires_at: body.expires_at || null,
          created_at: '2026-05-12T00:00:00Z',
        },
        error: null,
      },
      { status: 201 }
    );
  }),

  http.get(`${API_BASE}/api-keys`, () => {
    return HttpResponse.json(
      {
        data: [
          {
            id: 'apikey-uuid-001',
            name: 'Test Key',
            prefix: 'bcn_',
            last_used_at: null,
            expires_at: null,
            revoked: false,
            created_at: '2026-05-12T00:00:00Z',
          },
        ],
        error: null,
      },
      { status: 200 }
    );
  }),

  http.delete(`${API_BASE}/api-keys/:id`, ({ params }) => {
    if (params.id === '00000000-0000-0000-0000-000000000000') {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'API key not found' },
        { status: 404 }
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),
];

// ============================================================
// Anomaly handlers
// ============================================================

let mockAnomalies: Array<{
  id: string;
  pipeline_run_id: string;
  severity: string;
  type: string;
  description: string;
  deviation_details: Record<string, unknown>;
  detected_at: string;
  resolved_at: string | null;
}> = [
  {
    id: 'anomaly-uuid-001',
    pipeline_run_id: 'prun-uuid-001',
    severity: 'high',
    type: 'volume',
    description: 'Row count for public.orders decreased by 45%',
    deviation_details: {
      table: 'public.orders',
      metric: 'row_count',
      baseline_mean: 15200,
      baseline_stddev: 200,
      current_value: 8360,
      z_score: -4.2,
      threshold: 3.0,
    },
    detected_at: '2026-05-14T10:05:00Z',
    resolved_at: null,
  },
  {
    id: 'anomaly-uuid-002',
    pipeline_run_id: 'prun-uuid-001',
    severity: 'medium',
    type: 'null_check',
    description: 'Null percentage for public.users.email increased to 12%',
    deviation_details: {
      table: 'public.users',
      column: 'email',
      baseline_mean: 0.02,
      baseline_stddev: 0.01,
      current_value: 0.12,
      z_score: 3.5,
      threshold: 3.0,
    },
    detected_at: '2026-05-14T10:05:00Z',
    resolved_at: null,
  },
  {
    id: 'anomaly-uuid-003',
    pipeline_run_id: 'prun-uuid-002',
    severity: 'low',
    type: 'volume',
    description: 'Row count for public.products increased by 15%',
    deviation_details: {
      table: 'public.products',
      metric: 'row_count',
      baseline_mean: 5000,
      baseline_stddev: 500,
      current_value: 5750,
      z_score: 1.5,
      threshold: 3.0,
    },
    detected_at: '2026-05-13T10:05:00Z',
    resolved_at: '2026-05-14T08:00:00Z',
  },
];

export const anomalyHandlers = [
  // GET /api/v1/anomalies/recent — must be before :id route
  http.get(`${API_BASE}/anomalies/recent`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const recent = [...mockAnomalies]
      .sort(
        (a, b) =>
          new Date(b.detected_at).getTime() -
          new Date(a.detected_at).getTime()
      )
      .slice(0, limit);

    return HttpResponse.json(
      { data: recent, meta: { total: recent.length, limit }, error: null },
      { status: 200 }
    );
  }),

  // GET /api/v1/anomalies — list with filtering
  http.get(`${API_BASE}/anomalies`, ({ request }) => {
    const url = new URL(request.url);
    const severity = url.searchParams.get('severity');
    const type = url.searchParams.get('type');
    const resolved = url.searchParams.get('resolved');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '50');

    let filtered = [...mockAnomalies];

    if (severity) {
      filtered = filtered.filter((a) => a.severity === severity);
    }
    if (type) {
      filtered = filtered.filter((a) => a.type === type);
    }
    if (resolved !== null && resolved !== undefined && resolved !== '') {
      const isResolved = resolved === 'true';
      filtered = filtered.filter((a) => (a.resolved_at !== null) === isResolved);
    }

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const pageData = filtered.slice(start, start + perPage);

    return HttpResponse.json(
      {
        data: pageData,
        meta: { page, per_page: perPage, total },
        error: null,
      },
      { status: 200 }
    );
  }),

  // GET /api/v1/anomalies/:id — detail with nested pipeline_run and alerts
  http.get(`${API_BASE}/anomalies/:id`, ({ params }) => {
    const { id } = params;
    const anomaly = mockAnomalies.find((a) => a.id === id);

    if (!anomaly) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'Anomaly not found' },
        { status: 404 }
      );
    }

    const detail = {
      ...anomaly,
      pipeline_run: {
        id: anomaly.pipeline_run_id,
        pipeline: { id: 'pipe-uuid-001', name: 'Daily Volume Check' },
        data_source: { id: 'ds-uuid-001', name: 'Production PostgreSQL' },
        status: 'success',
        started_at: '2026-05-14T10:00:00Z',
        finished_at: '2026-05-14T10:00:05Z',
      },
      alerts: [
        {
          id: 'alert-uuid-001',
          channel: 'email',
          status: 'sent',
          sent_at: '2026-05-14T10:05:30Z',
        },
        {
          id: 'alert-uuid-002',
          channel: 'slack',
          status: 'pending',
          sent_at: null,
        },
      ],
    };

    return HttpResponse.json(
      { data: detail, error: null },
      { status: 200 }
    );
  }),

  // POST /api/v1/anomalies — create new anomaly
  http.post(`${API_BASE}/anomalies`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;

    if (!body.pipeline_run_id || !body.type || !body.severity) {
      return HttpResponse.json(
        {
          data: null,
          error: 'validation_error',
          message: 'pipeline_run_id, type, and severity are required',
        },
        { status: 422 }
      );
    }

    const newAnomaly = {
      id: `anomaly-uuid-${Date.now()}`,
      pipeline_run_id: body.pipeline_run_id,
      severity: body.severity,
      type: body.type,
      description: body.description || '',
      deviation_details: (body.deviation_details as Record<string, unknown>) || {},
      detected_at: new Date().toISOString(),
      resolved_at: null,
    };

    mockAnomalies.push(newAnomaly);

    return HttpResponse.json(
      { data: newAnomaly, error: null },
      { status: 201 }
    );
  }),

  // POST /api/v1/anomalies/:id/resolve — resolve an anomaly (idempotent)
  http.post(`${API_BASE}/anomalies/:id/resolve`, ({ params }) => {
    const { id } = params;
    const index = mockAnomalies.findIndex((a) => a.id === id);

    if (index === -1) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'Anomaly not found' },
        { status: 404 }
      );
    }

    mockAnomalies[index] = {
      ...mockAnomalies[index],
      resolved_at: new Date().toISOString(),
    };

    return HttpResponse.json(
      { data: mockAnomalies[index], error: null },
      { status: 200 }
    );
  }),
];

// ============================================================
// Pipeline Run handlers
// ============================================================

let mockPipelineRuns: Array<{
  id: string;
  pipeline_id: string;
  pipeline: { id: string; name: string; type: string };
  status: string;
  metrics_json: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
}> = [
  {
    id: 'prun-uuid-001',
    pipeline_id: 'pipe-uuid-001',
    pipeline: { id: 'pipe-uuid-001', name: 'Daily Volume Check', type: 'volume' },
    status: 'success',
    metrics_json: { row_count: 15420, previous_count: 15200, delta_pct: 1.45 },
    started_at: '2026-05-14T10:00:00Z',
    finished_at: '2026-05-14T10:00:05Z',
  },
  {
    id: 'prun-uuid-002',
    pipeline_id: 'pipe-uuid-001',
    pipeline: { id: 'pipe-uuid-001', name: 'Daily Volume Check', type: 'volume' },
    status: 'warning',
    metrics_json: { row_count: 13800, previous_count: 15200, delta_pct: -9.21 },
    started_at: '2026-05-13T10:00:00Z',
    finished_at: '2026-05-13T10:00:03Z',
  },
];

export const pipelineRunHandlers = [
  // POST /api/v1/pipelines/:pipelineId/run — trigger pipeline run
  http.post(`${API_BASE}/pipelines/:pipelineId/run`, ({ params }) => {
    const { pipelineId } = params;
    const runId = `prun-uuid-${Date.now()}`;

    const run = {
      id: runId,
      pipeline_id: pipelineId,
      pipeline: { id: pipelineId, name: 'Daily Volume Check', type: 'volume' },
      status: 'started',
      metrics_json: {},
      started_at: new Date().toISOString(),
      finished_at: null,
    };

    mockPipelineRuns.push(run);

    return HttpResponse.json(
      {
        data: {
          run_id: runId,
          pipeline_id: pipelineId,
          status: 'started',
          message: 'Pipeline run triggered successfully',
        },
        error: null,
      },
      { status: 202 }
    );
  }),

  // GET /api/v1/pipeline-runs/recent — must be before :id route
  http.get(`${API_BASE}/pipeline-runs/recent`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const recent = [...mockPipelineRuns]
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      )
      .slice(0, limit);

    return HttpResponse.json(
      { data: recent, meta: { total: recent.length, limit }, error: null },
      { status: 200 }
    );
  }),

  // GET /api/v1/pipeline-runs/:id — single run detail
  http.get(`${API_BASE}/pipeline-runs/:id`, ({ params }) => {
    const { id } = params;
    const run = mockPipelineRuns.find((r) => r.id === id);

    if (!run) {
      return HttpResponse.json(
        { data: null, error: 'not_found', message: 'Pipeline run not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(
      { data: run, error: null },
      { status: 200 }
    );
  }),

  // GET /api/v1/pipelines/:pipelineId/runs — list runs for a specific pipeline
  http.get(`${API_BASE}/pipelines/:pipelineId/runs`, ({ request, params }) => {
    const { pipelineId } = params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '50');

    let filtered = mockPipelineRuns.filter(
      (r) => r.pipeline_id === pipelineId
    );

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const pageData = filtered.slice(start, start + perPage);

    return HttpResponse.json(
      {
        data: pageData,
        meta: { page, per_page: perPage, total },
        error: null,
      },
      { status: 200 }
    );
  }),
];

// ============================================================
// Agent Token handlers
// ============================================================

let mockAgentTokens: Array<{
  id: string;
  agent_id: string;
  token_prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}> = [
  {
    id: 'token-uuid-001',
    agent_id: 'agent-uuid-001',
    token_prefix: 'beacon_agent_a1b2',
    name: 'Default',
    last_used_at: '2026-05-14T10:05:00Z',
    created_at: '2026-05-14T10:00:00Z',
  },
];

export const agentTokenHandlers = [
  // GET /api/v1/agents/:agentId/tokens
  http.get(`${API_BASE}/agents/:agentId/tokens`, ({ params }) => {
    const { agentId } = params;
    const tokens = mockAgentTokens.filter((t) => t.agent_id === agentId);

    return HttpResponse.json(
      { data: tokens, error: null },
      { status: 200 }
    );
  }),

  // DELETE /api/v1/agents/:agentId/tokens/:tokenId
  http.delete(
    `${API_BASE}/agents/:agentId/tokens/:tokenId`,
    ({ params }) => {
      const { agentId, tokenId } = params;
      const index = mockAgentTokens.findIndex(
        (t) => t.id === tokenId && t.agent_id === agentId
      );

      if (index === -1) {
        return HttpResponse.json(
          { data: null, error: 'not_found', message: 'Token not found' },
          { status: 404 }
        );
      }

      mockAgentTokens.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    }
  ),
];

// ============================================================
// Combine all handlers
// ============================================================

export const handlers = [
  ...authHandlers,
  ...datasourceHandlers,
  ...healthHandlers,
  ...pipelineHandlers,
  ...agentHandlers,
  ...apiKeyHandlers,
  ...anomalyHandlers,
  ...pipelineRunHandlers,
  ...agentTokenHandlers,
];
