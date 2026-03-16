import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Inbox,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useExecutionStore } from '../stores/executionStore';
import { useAgentStore } from '../stores/agentStore';
import StatusBadge from '../components/StatusBadge';
import { SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import type { ExecutionStatus, TriggerType } from '../types/execution';

type SortField = 'started_at' | 'duration_ms' | 'estimated_cost';
type SortDirection = 'asc' | 'desc';

const STATUS_OPTIONS: { value: ExecutionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'running', label: 'Running' },
];

const TRIGGER_OPTIONS: { value: TriggerType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Triggers' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'manual', label: 'Manual' },
  { value: 'webhook', label: 'Webhook' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
] as const;

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}m ${remainingSec}s`;
}

export default function ExecutionsPage() {
  const navigate = useNavigate();
  const {
    executions,
    isLoading,
    filters,
    autoRefresh,
    fetchExecutions,
    setFilter,
    getFilteredExecutions,
    toggleAutoRefresh,
  } = useExecutionStore();
  const { agents, fetchAgents } = useAgentStore();

  const [sortField, setSortField] = useState<SortField>('started_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  useEffect(() => {
    document.title = 'Executions | AgentForge';
  }, []);

  useEffect(() => {
    if (executions.length === 0) fetchExecutions();
  }, [executions.length, fetchExecutions]);

  useEffect(() => {
    if (agents.length === 0) fetchAgents();
  }, [agents.length, fetchAgents]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchExecutions();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchExecutions]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('desc');
      }
    },
    [sortField],
  );

  const sortedExecutions = useMemo(() => {
    const filtered = getFilteredExecutions();
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'started_at':
          cmp = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
          break;
        case 'duration_ms':
          cmp = (a.duration_ms || 0) - (b.duration_ms || 0);
          break;
        case 'estimated_cost':
          cmp = a.estimated_cost - b.estimated_cost;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [getFilteredExecutions, sortField, sortDir]);

  // Unique agents for dropdown
  const agentOptions = useMemo(() => {
    const unique = new Map<string, string>();
    executions.forEach((e) => unique.set(e.agent_id, e.agent_name));
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [executions]);

  function SortHeader({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) {
    const isActive = sortField === field;
    return (
      <th
        className="font-medium px-4 py-3 cursor-pointer select-none hover:text-gray-300 transition-colors text-left"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive &&
            (sortDir === 'asc' ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            ))}
        </div>
      </th>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-amber-accent" />
          <h1 className="text-2xl font-semibold text-gray-100">Executions</h1>
          <span className="text-sm text-gray-500">({sortedExecutions.length})</span>
        </div>
        <button
          onClick={toggleAutoRefresh}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
            autoRefresh
              ? 'bg-amber-accent/10 text-amber-accent border-amber-accent/20'
              : 'bg-white/[0.04] text-gray-400 border-card-border hover:bg-white/[0.08]'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
          Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={filters.agentId}
          onChange={(e) => setFilter({ agentId: e.target.value })}
          className="bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-accent/50 transition-colors"
        >
          <option value="all">All Agents</option>
          {agentOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilter({ status: e.target.value as ExecutionStatus | 'all' })}
          className="bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-accent/50 transition-colors"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.triggerType}
          onChange={(e) => setFilter({ triggerType: e.target.value as TriggerType | 'all' })}
          className="bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-accent/50 transition-colors"
        >
          {TRIGGER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.dateRange}
          onChange={(e) =>
            setFilter({ dateRange: e.target.value as 'all' | '24h' | '7d' | '30d' })
          }
          className="bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-accent/50 transition-colors"
        >
          {DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {(filters.agentId !== 'all' ||
          filters.status !== 'all' ||
          filters.triggerType !== 'all' ||
          filters.dateRange !== 'all') && (
          <button
            onClick={() =>
              setFilter({ agentId: 'all', status: 'all', triggerType: 'all', dateRange: 'all' })
            }
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={8} />
      ) : sortedExecutions.length === 0 ? (
        <div className="bg-card-bg border border-card-border rounded-lg">
          {executions.length === 0 ? (
            <EmptyState
              icon={<Zap className="w-10 h-10" />}
              title="No executions yet"
              description="Activate an agent to see execution results here."
              actionLabel="View Agents"
              actionTo="/agents"
            />
          ) : (
            <EmptyState
              icon={<Inbox className="w-10 h-10" />}
              title="No executions match your filters"
              description="Try adjusting your filter criteria."
            />
          )}
        </div>
      ) : (
        <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-card-border text-left">
                  <th className="font-medium px-4 py-3">Agent</th>
                  <th className="font-medium px-4 py-3">Trigger</th>
                  <th className="font-medium px-4 py-3">Status</th>
                  <SortHeader field="duration_ms">Duration</SortHeader>
                  <th className="font-medium px-4 py-3">LLM Calls</th>
                  <th className="font-medium px-4 py-3">Tokens</th>
                  <SortHeader field="estimated_cost">Cost</SortHeader>
                  <SortHeader field="started_at">Started</SortHeader>
                </tr>
              </thead>
              <tbody>
                {sortedExecutions.map((exec) => (
                  <tr
                    key={exec.id}
                    onClick={() => navigate(`/executions/${exec.id}`)}
                    className="border-b border-card-border last:border-b-0 hover:bg-sidebar-hover cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-200 font-medium">
                      {exec.agent_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 capitalize">
                      {exec.trigger_type}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={exec.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDuration(exec.duration_ms)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {exec.llm_calls}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {exec.total_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      ${exec.estimated_cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDistanceToNow(new Date(exec.started_at), {
                        addSuffix: true,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
