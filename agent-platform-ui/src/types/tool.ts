export type ToolTier = 'read' | 'write' | 'admin';
export type ToolCategory = 'crm' | 'communication' | 'data' | 'utility';

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
}

export interface Tool {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: ToolCategory;
  tier: ToolTier;
  parameters: ToolParameter[];
  requires_auth: boolean;
  enabled: boolean;
  icon?: string;
}

export interface ToolRegistryEntry {
  tool: Tool;
  usage_count: number;
  last_used_at: string | null;
  avg_duration_ms: number;
  success_rate: number;
}
