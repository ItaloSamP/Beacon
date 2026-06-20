import type { AlertRule, AlertRuleCreate, AlertRuleUpdate } from '../types/alert_rule';

const API_BASE = '/api/v1';

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired. Please log in again.');
    this.name = 'SessionExpiredError';
  }
}

let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function forceLogout() {
  clearTokens();
  localStorage.removeItem('beacon_user');
  window.dispatchEvent(new CustomEvent('beacon:force-logout'));
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) {
      console.warn('[API] Token refresh failed:', response.status);
      return false;
    }
    const body = await response.json();
    if (body.data) {
      setTokens(body.data.access_token, body.data.refresh_token);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[API] Token refresh network error:', err);
    return false;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    if (refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        response = await fetch(url, { ...options, headers });
      } else {
        forceLogout();
        throw new SessionExpiredError();
      }
    } else {
      forceLogout();
      throw new SessionExpiredError();
    }
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    // Non-JSON response (HTML error page, etc.)
    const text = await response.text().catch(() => '');
    const snippet = text.substring(0, 200);
    console.error(`[API] ${options.method || 'GET'} ${url} → ${response.status}: non-JSON response (${snippet}...)`);
    throw new Error(`Server error (HTTP ${response.status})`);
  }

  if (!response.ok) {
    const errorMessage = body.message || body.error || `Request failed (HTTP ${response.status})`;
    console.error(`[API] ${options.method || 'GET'} ${url} → ${response.status}: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  return body as T;
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};

// ============================================================
// Typed endpoint response shapes
// ============================================================

export interface DashboardStats {
  total: number;
  healthy: number;
  warning: number;
  error: number;
  offline: number;
}

export interface AnomalySummary {
  id: string;
  severity: string;
  type: string;
  description: string;
  detected_at: string;
}

export interface PipelineRunSummary {
  id: string;
  pipeline_id: string;
  status: string;
  started_at: string;
}

interface ApiEnvelope<T> {
  data: T;
  error: string | null;
}

// ============================================================
// Typed endpoint functions
// ============================================================

export async function getDashboardStats(): Promise<ApiEnvelope<DashboardStats>> {
  return api.get<ApiEnvelope<DashboardStats>>('/dashboard/stats');
}

export async function getAnomaliesRecent(limit?: number): Promise<AnomalySummary[]> {
  const endpoint = limit != null
    ? `/anomalies/recent?limit=${limit}`
    : '/anomalies/recent';
  const response = await api.get<ApiEnvelope<AnomalySummary[]>>(endpoint);
  return response.data;
}

export async function getPipelineRunsRecent(limit?: number): Promise<PipelineRunSummary[]> {
  const endpoint = limit != null
    ? `/pipeline-runs/recent?limit=${limit}`
    : '/pipeline-runs/recent';
  const response = await api.get<ApiEnvelope<PipelineRunSummary[]>>(endpoint);
  return response.data;
}

// ============================================================
// AlertRule endpoint functions
// ============================================================

export async function getRules(pipelineId: string): Promise<AlertRule[]> {
  const res = await api.get<ApiEnvelope<AlertRule[]>>(`/pipelines/${pipelineId}/rules`);
  return res.data ?? [];
}

export async function createRule(pipelineId: string, data: AlertRuleCreate): Promise<AlertRule> {
  const res = await api.post<ApiEnvelope<AlertRule>>(`/pipelines/${pipelineId}/rules`, data);
  return res.data!;
}

export async function updateRule(pipelineId: string, ruleId: string, data: AlertRuleUpdate): Promise<AlertRule> {
  const res = await api.put<ApiEnvelope<AlertRule>>(`/pipelines/${pipelineId}/rules/${ruleId}`, data);
  return res.data!;
}

export async function deleteRule(pipelineId: string, ruleId: string): Promise<void> {
  await api.delete(`/pipelines/${pipelineId}/rules/${ruleId}`);
}
