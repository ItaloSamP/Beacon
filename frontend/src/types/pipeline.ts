export type PipelineType = 'volume' | 'null_check' | 'schema_change' | 'distribution';
export type PipelineStatus = 'healthy' | 'warning' | 'paused';

export interface Pipeline {
  id: string;
  name: string;
  type: PipelineType;
  data_source_id: string;
  data_source?: { id: string; name: string };
  schedule: string | null;
  config: Record<string, unknown>;
  enabled: boolean;
  status?: PipelineStatus;
  created_at: string;
  updated_at: string;
}
