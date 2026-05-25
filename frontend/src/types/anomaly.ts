export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyType = 'volume' | 'null_check' | 'schema_change';

export interface Anomaly {
  id: string;
  pipeline_run_id: string;
  severity: AnomalySeverity;
  type: AnomalyType;
  description: string;
  deviation_details: Record<string, unknown>;
  detected_at: string;
  resolved_at: string | null;
}

export interface AnomalyListItem extends Anomaly {
  data_source: { id: string; name: string };
  pipeline: { id: string; name: string };
  recommendation?: string;
}

export interface AnomalyDetail extends Anomaly {
  recommendation?: string;
  pipeline_run?: {
    id: string;
    pipeline: { id: string; name: string };
    data_source: { id: string; name: string };
    status: string;
    started_at: string;
    finished_at: string | null;
  };
  alerts?: Array<{
    id: string;
    channel: string;
    status: string;
    sent_at: string | null;
    recipient?: string;
    error_message?: string | null;
  }>;
}

export interface AnomalyListResponse {
  data: AnomalyListItem[];
  meta: { page: number; per_page: number; total: number; active_count?: number };
  error: null;
}
