// ─── Connected Systems ───────────────────────────────────────────

export interface SystemCapabilities {
  read: boolean;
  write: boolean;
  query: boolean;
  webhook: boolean;
}

export interface ConnectedSystem {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: 'crm' | 'erp' | 'marketing' | 'storage' | 'ecommerce' | 'lims' | 'other';
  status: 'active' | 'inactive' | 'coming_soon';
  base_url: string | null;
  auth_type: 'oauth' | 'api_key' | 'token';
  credential_ref: string | null;
  capabilities: SystemCapabilities;
  created_at: string;
  updated_at: string;
}

export interface ConnectedSystemSummary {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category: string;
  status: string;
  capabilities: SystemCapabilities;
}

// ─── System Documents ────────────────────────────────────────────

export type DocType = 'architecture' | 'data_model' | 'integration_guide' | 'api_reference';

export interface SystemDocument {
  id: string;
  system_id: string;
  doc_type: DocType;
  title: string;
  content_md: string;
  version: number;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Guardrail Rules ─────────────────────────────────────────────

export type GuardrailScope = 'global' | 'system';
export type GuardrailCategory = 'data_access' | 'pii' | 'rate_limit' | 'cost' | 'compliance' | 'safety';
export type GuardrailRuleType = 'block' | 'warn' | 'log';

export interface GuardrailRule {
  id: string;
  scope: GuardrailScope;
  system_id: string | null;
  category: GuardrailCategory;
  name: string;
  description: string;
  rule_type: GuardrailRuleType;
  rule_definition: Record<string, unknown>;
  enabled: boolean;
  priority: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Business Context ────────────────────────────────────────────

export type ContextKey = 'company_overview' | 'org_structure' | 'processes' | 'terminology' | 'data_flow' | 'compliance';

export interface BusinessContext {
  id: string;
  context_key: ContextKey;
  title: string;
  content_md: string;
  version: number;
  updated_by: string;
  created_at: string;
  updated_at: string;
}
