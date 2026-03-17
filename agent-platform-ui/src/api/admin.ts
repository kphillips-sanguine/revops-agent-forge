import api from './client';
import type {
  BusinessContext,
  ConnectedSystem,
  ConnectedSystemSummary,
  GuardrailRule,
  SystemDocument,
} from '../types/admin';

// ─── Systems ─────────────────────────────────────────────────────

export async function fetchSystems(includeInactive = false): Promise<ConnectedSystemSummary[]> {
  const { data } = await api.get('/api/admin/systems', { params: { include_inactive: includeInactive } });
  return data;
}

export async function fetchSystem(id: string): Promise<ConnectedSystem> {
  const { data } = await api.get(`/api/admin/systems/${id}`);
  return data;
}

export async function createSystem(body: Partial<ConnectedSystem>): Promise<ConnectedSystem> {
  const { data } = await api.post('/api/admin/systems', body);
  return data;
}

export async function updateSystem(id: string, body: Partial<ConnectedSystem>): Promise<ConnectedSystem> {
  const { data } = await api.put(`/api/admin/systems/${id}`, body);
  return data;
}

export async function deleteSystem(id: string): Promise<void> {
  await api.delete(`/api/admin/systems/${id}`);
}

// ─── Documents ───────────────────────────────────────────────────

export async function fetchDocuments(systemId: string): Promise<SystemDocument[]> {
  const { data } = await api.get(`/api/admin/systems/${systemId}/documents`);
  return data;
}

export async function createDocument(systemId: string, body: Partial<SystemDocument>): Promise<SystemDocument> {
  const { data } = await api.post(`/api/admin/systems/${systemId}/documents`, body);
  return data;
}

export async function updateDocument(docId: string, body: Partial<SystemDocument>): Promise<SystemDocument> {
  const { data } = await api.put(`/api/admin/documents/${docId}`, body);
  return data;
}

export async function deleteDocument(docId: string): Promise<void> {
  await api.delete(`/api/admin/documents/${docId}`);
}

// ─── Guardrails ──────────────────────────────────────────────────

export async function fetchGuardrails(params?: {
  scope?: string;
  system_id?: string;
  category?: string;
}): Promise<GuardrailRule[]> {
  const { data } = await api.get('/api/admin/guardrails', { params });
  return data;
}

export async function createGuardrail(body: Partial<GuardrailRule>): Promise<GuardrailRule> {
  const { data } = await api.post('/api/admin/guardrails', body);
  return data;
}

export async function updateGuardrail(id: string, body: Partial<GuardrailRule>): Promise<GuardrailRule> {
  const { data } = await api.put(`/api/admin/guardrails/${id}`, body);
  return data;
}

export async function deleteGuardrail(id: string): Promise<void> {
  await api.delete(`/api/admin/guardrails/${id}`);
}

// ─── Business Context ────────────────────────────────────────────

export async function fetchBusinessContextList(): Promise<BusinessContext[]> {
  const { data } = await api.get('/api/admin/context');
  return data;
}

export async function fetchBusinessContext(key: string): Promise<BusinessContext> {
  const { data } = await api.get(`/api/admin/context/${key}`);
  return data;
}

export async function upsertBusinessContext(key: string, body: { title: string; content_md: string }): Promise<BusinessContext> {
  const { data } = await api.put(`/api/admin/context/${key}`, body);
  return data;
}
