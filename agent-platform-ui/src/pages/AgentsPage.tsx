import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bot,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  Eye,
  Pencil,
  Ban,
  X,
  Inbox,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAgentStore } from '../stores/agentStore';
import { mockExecutions } from '../mocks/executions';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import type { AgentStatus, Agent } from '../types/agent';

type SortField = 'name' | 'status' | 'last_execution_at' | 'execution_count' | 'estimated_cost';
type SortDirection = 'asc' | 'desc';

const STATUS_OPTIONS: { value: AgentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

export default function AgentsPage() {
  const navigate = useNavigate();
  const { agents, isLoading, fetchAgents, filters, setFilter, getFilteredAgents, updateAgentStatus } = useAgentStore();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    document.title = 'Agents | AgentForge';
  }, []);

  useEffect(() => {
    if (agents.length === 0) fetchAgents();
  }, [agents.length, fetchAgents]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilter({ search: searchInput });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, setFilter]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('asc');
      }
    },
    [sortField],
  );

  const getSuccessRate = useCallback(
    (agentId: string) => {
      const agentExecs = mockExecutions.filter((e) => e.agent_id === agentId);
      if (agentExecs.length === 0) return null;
      const successes = agentExecs.filter((e) => e.status === 'success').length;
      return Math.round((successes / agentExecs.length) * 100);
    },
    [],
  );

  const sortedAgents = useMemo(() => {
    const filtered = getFilteredAgents();
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'last_execution_at': {
          const aTime = a.last_execution_at ? new Date(a.last_execution_at).getTime() : 0;
          const bTime = b.last_execution_at ? new Date(b.last_execution_at).getTime() : 0;
          cmp = aTime - bTime;
          break;
        }
        case 'execution_count':
          cmp = a.execution_count - b.execution_count;
          break;
        case 'estimated_cost':
          cmp = a.estimated_cost - b.estimated_cost;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [getFilteredAgents, sortField, sortDir]);

  const allTags = useMemo(
    () => [...new Set(agents.flatMap((a) => a.tags))].sort(),
    [agents],
  );

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    const isActive = sortField === field;
    return (
      <th
        className="font-medium px-3 py-3 cursor-pointer select-none hover:text-gray-300 transition-colors"
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

  const getActionButtons = (agent: Agent) => {
    const buttons: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }[] = [
      {
        icon: Eye,
        label: 'View',
        onClick: () => navigate(`/agents/${agent.id}`),
      },
    ];

    if (agent.status === 'draft') {
      buttons.push({
        icon: Pencil,
        label: 'Edit',
        onClick: () => navigate(`/agents/${agent.id}`),
      });
    }

    if (agent.status === 'active') {
      buttons.push({
        icon: Ban,
        label: 'Disable',
        onClick: () => {
          updateAgentStatus(agent.id, 'disabled');
          toast.success(`${agent.name} disabled`);
        },
      });
    }

    return buttons;
  };

  const hasActiveFilters = filters.status !== 'all' || filters.search !== '' || filters.tags.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-amber-accent" />
          <h1 className="text-2xl font-semibold text-gray-100">Agents</h1>
          <span className="text-sm text-gray-500">({agents.length})</span>
        </div>
        <button
          onClick={() => navigate('/builder')}
          className="flex items-center gap-2 px-4 py-2 bg-amber-accent hover:bg-amber-accent-hover text-gray-950 text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilter({ status: e.target.value as AgentStatus | 'all' })}
          className="bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-accent/50 transition-colors"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search agents..."
            className="w-full bg-card-bg border border-card-border rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-accent/50 transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tag Filter */}
        <select
          value=""
          onChange={(e) => {
            const tag = e.target.value;
            if (tag && !filters.tags.includes(tag)) {
              setFilter({ tags: [...filters.tags, tag] });
            }
          }}
          className="bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-accent/50 transition-colors"
        >
          <option value="">Filter by tag...</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        {/* Active tag chips */}
        {filters.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-accent/10 text-amber-accent border border-amber-accent/20"
          >
            {tag}
            <button
              onClick={() =>
                setFilter({ tags: filters.tags.filter((t) => t !== tag) })
              }
              className="hover:text-amber-200 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {hasActiveFilters && (
          <button
            onClick={() => {
              setFilter({ status: 'all', search: '', tags: [] });
              setSearchInput('');
            }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Agents Table */}
      {isLoading ? (
        <SkeletonTable rows={6} cols={9} />
      ) : (
      <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
        {sortedAgents.length === 0 ? (
          agents.length === 0 ? (
            <EmptyState
              icon={<Bot className="w-10 h-10" />}
              title="Create your first agent"
              description="Get started by building an agent in the Builder."
              actionLabel="Go to Builder"
              actionTo="/builder"
            />
          ) : (
            <EmptyState
              icon={<Inbox className="w-10 h-10" />}
              title="No agents match your filters"
              description="Try adjusting your search or filter criteria."
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-card-border text-left">
                  <SortHeader field="name">Name</SortHeader>
                  <SortHeader field="status">Status</SortHeader>
                  <th className="font-medium px-3 py-3">Author</th>
                  <th className="font-medium px-3 py-3">Version</th>
                  <SortHeader field="last_execution_at">Last Run</SortHeader>
                  <SortHeader field="execution_count">Runs</SortHeader>
                  <th className="font-medium px-3 py-3">Success</th>
                  <SortHeader field="estimated_cost">Cost</SortHeader>
                  <th className="font-medium px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedAgents.map((agent) => {
                  const successRate = getSuccessRate(agent.id);
                  return (
                    <tr
                      key={agent.id}
                      className="border-b border-card-border last:border-b-0 hover:bg-sidebar-hover transition-colors"
                    >
                      <td
                        className="px-3 py-3 text-sm text-gray-200 font-medium cursor-pointer hover:text-amber-accent transition-colors"
                        onClick={() => navigate(`/agents/${agent.id}`)}
                      >
                        <div>
                          <div>{agent.name}</div>
                          <div className="flex gap-1 mt-1">
                            {agent.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={agent.status} />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-400">
                        {agent.created_by.split('@')[0]}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-400">v{agent.version}</td>
                      <td className="px-3 py-3 text-sm text-gray-400">
                        {agent.last_execution_at
                          ? formatDistanceToNow(new Date(agent.last_execution_at), {
                              addSuffix: true,
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-400">
                        {agent.execution_count}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {successRate !== null ? (
                          <span
                            className={
                              successRate >= 80
                                ? 'text-emerald-400'
                                : successRate >= 50
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }
                          >
                            {successRate}%
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-400">
                        ${agent.estimated_cost.toFixed(2)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {getActionButtons(agent).map((btn) => (
                            <button
                              key={btn.label}
                              onClick={(e) => {
                                e.stopPropagation();
                                btn.onClick();
                              }}
                              title={btn.label}
                              className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              <btn.icon className="w-3.5 h-3.5" />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
