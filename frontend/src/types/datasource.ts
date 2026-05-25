export type DataSourceType = 'postgres' | 'mysql' | 'bigquery' | 'google_sheets';
export type DataSourceStatus = 'active' | 'inactive' | 'error';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DataSourceTimelineEntry {
  date: string;
  count: number;
  maxSeverity: SeverityLevel | null;
}

export interface ActivePipeline {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
}

export interface RecentAnomalyItem {
  id: string;
  severity: string;
  type: string;
  description: string;
  detected_at: string;
  resolved_at?: string | null;
}

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  agent_id?: string | null;
  agent?: { id: string; name: string; status: string } | null;
  connection_config: Record<string, unknown>;
  status: DataSourceStatus;
  host?: string;
  last_profiled_at?: string;
  pipelines_count?: number;
  active_anomalies?: number;
  created_at: string;
  updated_at: string;
  timeline?: DataSourceTimelineEntry[];
  active_pipelines?: ActivePipeline[];
  recent_anomalies?: RecentAnomalyItem[];
}

export interface CreateDataSourceRequest {
  name: string;
  type: DataSourceType;
  agent_id?: string;
  connection_config: Record<string, unknown>;
  status: DataSourceStatus;
}

export interface UpdateDataSourceRequest {
  name?: string;
  type?: DataSourceType;
  agent_id?: string | null;
  connection_config?: Record<string, unknown>;
  status?: DataSourceStatus;
}
