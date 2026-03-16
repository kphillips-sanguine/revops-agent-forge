export type ExecutionStatus = 'running' | 'success' | 'failed' | 'timeout' | 'cancelled';
export type TriggerType = 'scheduled' | 'manual' | 'webhook';

export interface ToolCall {
  id: string;
  tool_name: string;
  input_summary: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: 'success' | 'failed' | 'skipped';
  duration_ms: number;
  error?: string;
  started_at: string;
}

export interface ExecutionStep {
  id: string;
  type: 'start' | 'tool_call' | 'llm_call' | 'complete' | 'error';
  timestamp: string;
  duration_ms?: number;
  tool_call?: ToolCall;
  message?: string;
  status?: 'success' | 'failed';
}

export interface Execution {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_version: number;
  status: ExecutionStatus;
  trigger_type: TriggerType;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  llm_calls: number;
  total_tokens: number;
  estimated_cost: number;
  output: string | null;
  error: string | null;
  steps: ExecutionStep[];
  guardrails_applied: string[];
  input_context: Record<string, unknown>;
}
