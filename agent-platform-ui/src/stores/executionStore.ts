import { create } from 'zustand';
import type { Execution, ExecutionStatus, TriggerType } from '../types/execution';
import { mockExecutions } from '../mocks/executions';
import { listExecutions } from '../api/executions';
import type { ExecutionSummaryResponse } from '../api/executions';

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

function summaryToExecution(s: ExecutionSummaryResponse): Execution {
  return {
    id: s.execution_id,
    agent_id: s.agent_id,
    agent_name: s.agent_name ?? 'Unknown',
    agent_version: s.agent_version,
    status: s.status as ExecutionStatus,
    trigger_type: s.trigger_type as TriggerType,
    started_at: s.started_at,
    completed_at: s.completed_at,
    duration_ms: s.duration_seconds != null ? s.duration_seconds * 1000 : null,
    llm_calls: 0,
    total_tokens: s.tokens_used,
    estimated_cost: 0,
    output: null,
    error: null,
    steps: [],
    guardrails_applied: [],
    input_context: {},
  };
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

  fetchExecutions: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await listExecutions();
      set({ executions: data.map(summaryToExecution), isLoading: false });
    } catch {
      // Fallback to mock data if API is unavailable
      console.warn('API unavailable, using mock execution data');
      set({ executions: mockExecutions, isLoading: false });
    }
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
