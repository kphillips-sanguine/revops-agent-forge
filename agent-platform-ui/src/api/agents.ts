import apiClient from './client';
import type { AgentCreatePayload, AgentUpdatePayload } from '../types/agent';

// Backend response types (match Pydantic schemas)
export interface AgentSummaryResponse {
  id: string;
  name: string;
  version: number;
  status: string;
  created_by: string;
  tags: string[];
  last_execution_at: string | null;
  execution_count: number;
  success_rate: number;
  estimated_cost: number;
}

export interface AgentDetailResponse {
  id: string;
  name: string;
  version: number;
  status: string;
  definition_md: string;
  guardrails_md: string | null;
  tools_allowed: string[];
  schedule: Record<string, unknown> | null;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  last_execution_at: string | null;
  execution_count: number;
  estimated_cost: number;
}

export async function listAgents(params?: {
  status?: string;
  search?: string;
  tags?: string;
}): Promise<AgentSummaryResponse[]> {
  const response = await apiClient.get<AgentSummaryResponse[]>(
    '/api/agents/',
    { params },
  );
  return response.data;
}

export async function getAgent(id: string): Promise<AgentDetailResponse> {
  const response = await apiClient.get<AgentDetailResponse>(
    `/api/agents/${id}`,
  );
  return response.data;
}

export async function createAgent(
  data: AgentCreatePayload,
): Promise<AgentDetailResponse> {
  const response = await apiClient.post<AgentDetailResponse>(
    '/api/agents/',
    data,
  );
  return response.data;
}

export async function updateAgent(
  id: string,
  data: AgentUpdatePayload,
): Promise<AgentDetailResponse> {
  const response = await apiClient.put<AgentDetailResponse>(
    `/api/agents/${id}`,
    data,
  );
  return response.data;
}

export async function deleteAgent(id: string): Promise<void> {
  await apiClient.delete(`/api/agents/${id}`);
}

export async function submitForReview(id: string): Promise<AgentDetailResponse> {
  const response = await apiClient.patch<AgentDetailResponse>(
    `/api/agents/${id}/submit`,
  );
  return response.data;
}

export async function approveAgent(
  id: string,
  notes?: string,
): Promise<AgentDetailResponse> {
  const response = await apiClient.patch<AgentDetailResponse>(
    `/api/agents/${id}/approve`,
    { notes },
  );
  return response.data;
}

export async function rejectAgent(
  id: string,
  reason: string,
): Promise<AgentDetailResponse> {
  const response = await apiClient.patch<AgentDetailResponse>(
    `/api/agents/${id}/reject`,
    { reason },
  );
  return response.data;
}

export async function activateAgent(
  id: string,
): Promise<AgentDetailResponse> {
  const response = await apiClient.patch<AgentDetailResponse>(
    `/api/agents/${id}/activate`,
  );
  return response.data;
}

export async function disableAgent(
  id: string,
  reason?: string,
): Promise<AgentDetailResponse> {
  const response = await apiClient.patch<AgentDetailResponse>(
    `/api/agents/${id}/disable`,
    { reason },
  );
  return response.data;
}

export interface AgentVersionResponse {
  id: string;
  agent_id: string;
  version: number;
  changed_by: string;
  change_reason: string | null;
  created_at: string;
}

export async function listVersions(
  agentId: string,
): Promise<AgentVersionResponse[]> {
  const response = await apiClient.get<AgentVersionResponse[]>(
    `/api/agents/${agentId}/versions`,
  );
  return response.data;
}
