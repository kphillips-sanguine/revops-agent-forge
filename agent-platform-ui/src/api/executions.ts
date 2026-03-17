import apiClient from './client';

export interface ExecutionSummaryResponse {
  execution_id: string;
  agent_id: string;
  agent_name: string | null;
  agent_version: number;
  trigger_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  tokens_used: number;
}

export interface ToolCallLogResponse {
  id: string;
  tool_name: string;
  call_order: number;
  input_params: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  status: string;
  duration_ms: number | null;
  error: string | null;
  called_at: string;
}

export interface ExecutionDetailResponse {
  execution_id: string;
  agent_id: string;
  agent_version: number;
  trigger_type: string;
  status: string;
  input_context: Record<string, unknown>;
  output: Record<string, unknown> | null;
  llm_calls: number;
  tokens_used: number;
  estimated_cost_micros: number;
  started_at: string;
  completed_at: string | null;
  error_log: string | null;
  tool_calls: ToolCallLogResponse[];
}

export async function listExecutions(params?: {
  agent_id?: string;
  status?: string;
  trigger_type?: string;
}): Promise<ExecutionSummaryResponse[]> {
  const response = await apiClient.get<ExecutionSummaryResponse[]>(
    '/api/exec/',
    { params },
  );
  return response.data;
}

export async function getExecution(
  id: string,
): Promise<ExecutionDetailResponse> {
  const response = await apiClient.get<ExecutionDetailResponse>(
    `/api/exec/${id}`,
  );
  return response.data;
}

export async function getExecutionLogs(
  id: string,
): Promise<ToolCallLogResponse[]> {
  const response = await apiClient.get<ToolCallLogResponse[]>(
    `/api/exec/${id}/logs`,
  );
  return response.data;
}
