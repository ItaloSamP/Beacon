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

    return HttpResponse.json(
      { data: newAgent, error: null },
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
// Combine all handlers
// ============================================================

export const handlers = [
  ...authHandlers,
  ...datasourceHandlers,
  ...healthHandlers,
  ...pipelineHandlers,
  ...agentHandlers,
  ...apiKeyHandlers,
];
