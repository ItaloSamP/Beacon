export type AgentStatus = 'online' | 'offline';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  user_id: string;
  last_heartbeat_at: string | null;
  version: string | null;
  host?: string | null;
  data_sources_count?: number;
  pipelines_count?: number;
  agent_token?: string;
  created_at: string;
}

export interface CreateAgentRequest {
  name: string;
  status?: AgentStatus;
  version?: string;
}

export interface UpdateAgentRequest {
  name?: string;
  status?: AgentStatus;
  version?: string;
}
