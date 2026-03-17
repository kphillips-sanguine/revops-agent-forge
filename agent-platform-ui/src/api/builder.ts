import apiClient from './client';

export interface BuilderGenerateRequest {
  prompt: string;
  conversation_history: Array<{ role: string; content: string }>;
  current_definition: string | null;
  context?: Record<string, unknown>;
}

export interface BuilderGenerateResponse {
  definition_md: string;
  explanation: string;
  tools_used: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ValidateRequest {
  definition_md: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface SimulationRequest {
  agent_id?: string;
  definition_md?: string;
  mock_inputs: Record<string, unknown>;
}

export interface SimulationTimelineEntry {
  step: number;
  action: string;
  status: string;
  message?: string;
  tool_name?: string;
  duration_ms: number;
  timestamp: string;
  tool_call?: {
    tool_name: string;
    input_summary: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    status: string;
    duration_ms: number;
  };
}

export interface SimulationResult {
  status: string;
  timeline: SimulationTimelineEntry[];
  output: Record<string, unknown> | null;
  tokens_used: number;
  warnings: string[];
}

export async function generateAgent(
  data: BuilderGenerateRequest,
): Promise<BuilderGenerateResponse> {
  const response = await apiClient.post<BuilderGenerateResponse>(
    '/api/builder/generate',
    data,
  );
  return response.data;
}

export async function validateDefinition(
  definitionMd: string,
): Promise<ValidationResult> {
  const response = await apiClient.post<ValidationResult>(
    '/api/builder/validate',
    { definition_md: definitionMd },
  );
  return response.data;
}

export async function simulateAgent(
  data: SimulationRequest,
): Promise<SimulationResult> {
  const response = await apiClient.post<SimulationResult>(
    '/api/builder/simulate',
    data,
  );
  return response.data;
}
