export type AgentStatus = 'online' | 'offline';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  user_id: string;
  last_heartbeat_at: string | null;
  version: string | null;
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
