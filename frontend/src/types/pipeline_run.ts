export type PipelineRunStatus = 'success' | 'warning' | 'error' | 'running';

export interface PipelineRun {
  id: string;
  pipeline_id: string;
  pipeline?: { id: string; name: string; type: string };
  status: PipelineRunStatus;
  metrics_json: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
}

export interface PipelineRunTriggerResponse {
  run_id: string;
  pipeline_id: string;
  status: string;
  message: string;
}
