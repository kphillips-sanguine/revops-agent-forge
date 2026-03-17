import { create } from 'zustand';
import type { Agent, AgentStatus } from '../types/agent';
import { mockAgents } from '../mocks/agents';
import { listAgents } from '../api/agents';
import type { AgentSummaryResponse } from '../api/agents';

interface AgentFilters {
  status: AgentStatus | 'all';
  search: string;
  tags: string[];
}

interface AgentState {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  filters: AgentFilters;
  fetchAgents: () => void;
  setFilter: (filters: Partial<AgentFilters>) => void;
  getAgentById: (id: string) => Agent | undefined;
  getFilteredAgents: () => Agent[];
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  updateAgentDefinition: (id: string, definition_md: string) => void;
}

function summaryToAgent(s: AgentSummaryResponse): Agent {
  return {
    id: s.id,
    name: s.name,
    version: s.version,
    status: s.status as AgentStatus,
    definition_md: '',
    guardrails_md: null,
    tools_allowed: [],
    model_id: null,
    schedule: null,
    tags: s.tags,
    created_by: s.created_by,
    approved_by: null,
    created_at: s.last_execution_at ?? new Date().toISOString(),
    updated_at: s.last_execution_at ?? new Date().toISOString(),
    last_execution_at: s.last_execution_at,
    execution_count: s.execution_count,
    estimated_cost: s.estimated_cost,
  };
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  isLoading: false,
  error: null,
  filters: {
    status: 'all',
    search: '',
    tags: [],
  },

  fetchAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await listAgents();
      set({ agents: data.map(summaryToAgent), isLoading: false });
    } catch {
      // Fallback to mock data if API is unavailable
      console.warn('API unavailable, using mock data');
      set({ agents: mockAgents, isLoading: false });
    }
  },

  setFilter: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  getAgentById: (id: string) => {
    return get().agents.find((a) => a.id === id);
  },

  getFilteredAgents: () => {
    const { agents, filters } = get();
    let filtered = agents;

    if (filters.status !== 'all') {
      filtered = filtered.filter((a) => a.status === filters.status);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(search) ||
          a.tags.some((t) => t.toLowerCase().includes(search)),
      );
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter((a) =>
        filters.tags.some((tag) => a.tags.includes(tag)),
      );
    }

    return filtered;
  },

  updateAgent: (id, updates) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a,
      ),
    }));
  },

  updateAgentStatus: (id, status) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              updated_at: new Date().toISOString(),
              approved_by: status === 'approved' || status === 'active' ? 'kevin@sanguinebio.com' : a.approved_by,
            }
          : a,
      ),
    }));
  },

  updateAgentDefinition: (id, definition_md) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, definition_md, updated_at: new Date().toISOString() } : a,
      ),
    }));
  },
}));
