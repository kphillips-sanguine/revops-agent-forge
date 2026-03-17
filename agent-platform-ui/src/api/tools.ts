import apiClient from './client';

export interface ToolSummaryResponse {
  id: string;
  name: string;
  display_name: string;
  description: string;
  tier: string;
  tool_type: string;
  enabled: boolean;
  requires_approval: boolean;
}

export interface ToolDetailResponse {
  id: string;
  name: string;
  display_name: string;
  description: string;
  tier: string;
  tool_type: string;
  implementation: Record<string, unknown>;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown> | null;
  rate_limit_per_execution: number;
  rate_limit_per_day: number;
  requires_approval: boolean;
  enabled: boolean;
  managed_by: string;
  documentation_md: string | null;
  created_at: string;
  updated_at: string;
}

export async function listTools(params?: {
  tier?: string;
  enabled?: boolean;
}): Promise<ToolSummaryResponse[]> {
  const response = await apiClient.get<ToolSummaryResponse[]>('/api/tools/', {
    params,
  });
  return response.data;
}

export async function getTool(id: string): Promise<ToolDetailResponse> {
  const response = await apiClient.get<ToolDetailResponse>(
    `/api/tools/${id}`,
  );
  return response.data;
}
