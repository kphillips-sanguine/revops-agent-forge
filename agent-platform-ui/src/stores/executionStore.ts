import { create } from 'zustand';
import type { Execution, ExecutionStatus, TriggerType } from '../types/execution';
import { mockExecutions } from '../mocks/executions';

interface ExecutionFilters {
  agentId: string | 'all';
  status: ExecutionStatus | 'all';
  triggerType: TriggerType | 'all';
  dateRange: 'all' | '24h' | '7d' | '30d';
}

interface ExecutionState {
  executions: Execution[];
  isLoading: boolean;
  error: string | null;
  filters: ExecutionFilters;
  autoRefresh: boolean;
  fetchExecutions: () => void;
  getExecutionById: (id: string) => Execution | undefined;
  setFilter: (filters: Partial<ExecutionFilters>) => void;
  getFilteredExecutions: () => Execution[];
  toggleAutoRefresh: () => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  executions: [],
  isLoading: false,
  error: null,
  filters: {
    agentId: 'all',
    status: 'all',
    triggerType: 'all',
    dateRange: 'all',
  },
  autoRefresh: false,

  fetchExecutions: () => {
    set({ isLoading: true, error: null });
    setTimeout(() => {
      set({ executions: mockExecutions, isLoading: false });
    }, 400);
  },

  getExecutionById: (id: string) => {
    return get().executions.find((e) => e.id === id);
  },

  setFilter: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  getFilteredExecutions: () => {
    const { executions, filters } = get();
    let filtered = executions;

    if (filters.agentId !== 'all') {
      filtered = filtered.filter((e) => e.agent_id === filters.agentId);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter((e) => e.status === filters.status);
    }

    if (filters.triggerType !== 'all') {
      filtered = filtered.filter((e) => e.trigger_type === filters.triggerType);
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (filters.dateRange) {
        case '24h':
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      filtered = filtered.filter((e) => new Date(e.started_at) >= cutoff);
    }

    return filtered;
  },

  toggleAutoRefresh: () => {
    set((state) => ({ autoRefresh: !state.autoRefresh }));
  },
}));
