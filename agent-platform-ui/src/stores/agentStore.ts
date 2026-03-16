import { create } from 'zustand';
import type { Agent, AgentStatus } from '../types/agent';
import { mockAgents } from '../mocks/agents';

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

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  isLoading: false,
  error: null,
  filters: {
    status: 'all',
    search: '',
    tags: [],
  },

  fetchAgents: () => {
    set({ isLoading: true, error: null });
    // Simulate async load from mock data
    setTimeout(() => {
      set({ agents: mockAgents, isLoading: false });
    }, 300);
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
