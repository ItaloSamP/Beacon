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

export interface AnomalyListResponse {
  data: Anomaly[];
  meta: { page: number; per_page: number; total: number };
  error: null;
}
