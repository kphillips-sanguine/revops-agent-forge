import type {
  BusinessContext,
  ConnectedSystemSummary,
  GuardrailRule,
} from '../types/admin';

export const mockSystems: ConnectedSystemSummary[] = [
  { id: 'sys-01', name: 'Salesforce', slug: 'salesforce', icon: 'cloud', category: 'crm', status: 'active', capabilities: { read: true, write: true, query: true, webhook: true } },
  { id: 'sys-02', name: 'HubSpot', slug: 'hubspot', icon: 'megaphone', category: 'marketing', status: 'active', capabilities: { read: true, write: true, query: true, webhook: true } },
  { id: 'sys-03', name: 'SharePoint', slug: 'sharepoint', icon: 'file-text', category: 'storage', status: 'active', capabilities: { read: true, write: true, query: true, webhook: false } },
  { id: 'sys-04', name: 'NetSuite', slug: 'netsuite', icon: 'dollar-sign', category: 'erp', status: 'active', capabilities: { read: true, write: true, query: true, webhook: false } },
  { id: 'sys-05', name: 'Google Drive', slug: 'google-drive', icon: 'hard-drive', category: 'storage', status: 'active', capabilities: { read: true, write: true, query: true, webhook: false } },
  { id: 'sys-06', name: 'Google Sheets', slug: 'google-sheets', icon: 'table', category: 'storage', status: 'active', capabilities: { read: true, write: true, query: false, webhook: false } },
  { id: 'sys-07', name: 'WooCommerce', slug: 'woocommerce', icon: 'shopping-cart', category: 'ecommerce', status: 'active', capabilities: { read: true, write: true, query: true, webhook: true } },
  { id: 'sys-08', name: 'LabGuru', slug: 'labguru', icon: 'flask-conical', category: 'lims', status: 'active', capabilities: { read: true, write: true, query: true, webhook: false } },
];

export const mockGuardrails: GuardrailRule[] = [
  { id: 'gr-01', scope: 'global', system_id: null, category: 'pii', name: 'No PII in Agent Output', description: 'Block agent output containing donor PII', rule_type: 'block', rule_definition: {}, enabled: true, priority: 10, created_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'gr-02', scope: 'global', system_id: null, category: 'cost', name: 'Max LLM Calls Per Execution', description: 'Hard cap of 100 LLM calls per execution', rule_type: 'block', rule_definition: { max_llm_calls: 100 }, enabled: true, priority: 20, created_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'gr-03', scope: 'global', system_id: null, category: 'rate_limit', name: 'Max Execution Time', description: 'Agent must complete within 600 seconds', rule_type: 'block', rule_definition: { max_seconds: 600 }, enabled: true, priority: 20, created_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'gr-04', scope: 'global', system_id: null, category: 'safety', name: 'No External Communications Without Review', description: 'Warn on external recipient emails', rule_type: 'warn', rule_definition: {}, enabled: true, priority: 30, created_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'gr-05', scope: 'global', system_id: null, category: 'compliance', name: 'Audit All Write Operations', description: 'Log all write operations for audit', rule_type: 'log', rule_definition: {}, enabled: true, priority: 50, created_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'gr-06', scope: 'global', system_id: null, category: 'data_access', name: 'Financial Data Restriction', description: 'Block reading financial data without finance-approved tag', rule_type: 'block', rule_definition: {}, enabled: true, priority: 25, created_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
];

export const mockBusinessContext: BusinessContext[] = [
  { id: 'bc-01', context_key: 'company_overview', title: 'Company Overview', content_md: '# Sanguine Biosciences\n\nBiotech company specializing in biological sample collection and processing.', version: 1, updated_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'bc-02', context_key: 'org_structure', title: 'Organization Structure', content_md: '# Org Structure\n\nDepartments: Commercial, Operations, Lab, Finance, IT/RevOps, Marketing, Quality', version: 1, updated_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'bc-03', context_key: 'processes', title: 'Business Processes', content_md: '# Key Processes\n\nLead-to-Cash, Support, Inventory Management', version: 1, updated_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'bc-04', context_key: 'terminology', title: 'Business Terminology', content_md: '# Terminology\n\nBiospecimen, PBMC, Donor, Protocol, Assay, LIMS, SOW, MSA', version: 1, updated_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'bc-05', context_key: 'data_flow', title: 'Data Flow & Integrations', content_md: '# Data Flows\n\nSalesforce is the hub. NetSuite for financials. LabGuru for operations.', version: 1, updated_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
  { id: 'bc-06', context_key: 'compliance', title: 'Compliance & Governance', content_md: '# Compliance\n\nHIPAA, IRB, GDPR, 21 CFR Part 11, CAP/CLIA', version: 1, updated_by: 'kevin@sanguinebio.com', created_at: '2026-03-16T00:00:00Z', updated_at: '2026-03-16T00:00:00Z' },
];
