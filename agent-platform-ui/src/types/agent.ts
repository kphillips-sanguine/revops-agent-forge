export type AgentStatus = 'draft' | 'pending_review' | 'approved' | 'active' | 'disabled';

export interface AgentSchedule {
  type: 'cron' | 'interval' | 'webhook';
  value: string;
  timezone?: string;
  enabled: boolean;
}

export interface Agent {
  id: string;
  name: string;
  version: number;
  status: AgentStatus;
  definition_md: string;
  guardrails_md: string | null;
  tools_allowed: string[];
  schedule: AgentSchedule | null;
  model_id: string | null;
  tags: string[];
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  last_execution_at: string | null;
  execution_count: number;
  estimated_cost: number;
}

export interface AgentCreatePayload {
  name: string;
  definition_md: string;
  guardrails_md?: string;
  tools_allowed: string[];
  model_id?: string;
  schedule?: AgentSchedule;
  tags?: string[];
}

export interface AgentUpdatePayload {
  name?: string;
  definition_md?: string;
  guardrails_md?: string;
  tools_allowed?: string[];
  model_id?: string;
  schedule?: AgentSchedule;
  tags?: string[];
  status?: AgentStatus;
}
