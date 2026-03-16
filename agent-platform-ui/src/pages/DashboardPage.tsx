import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Clock,
  Zap,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAgentStore } from '../stores/agentStore';
import { mockExecutions } from '../mocks/executions';
import StatusBadge from '../components/StatusBadge';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    green: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    neutral: 'text-gray-300 bg-gray-500/10',
  };

  return (
    <div className="bg-card-bg border border-card-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-100">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { agents, fetchAgents } = useAgentStore();

  useEffect(() => {
    if (agents.length === 0) fetchAgents();
  }, [agents.length, fetchAgents]);

  const stats = useMemo(() => {
    const activeAgents = agents.filter((a) => a.status === 'active').length;
    const pendingReview = agents.filter((a) => a.status === 'pending_review').length;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const executionsThisWeek = mockExecutions.filter(
      (e) => new Date(e.started_at) >= oneWeekAgo,
    ).length;

    const totalCost = mockExecutions.reduce((sum, e) => sum + e.estimated_cost, 0);

    return { activeAgents, pendingReview, executionsThisWeek, totalCost };
  }, [agents]);

  const recentAgents = useMemo(
    () =>
      [...agents]
        .filter((a) => a.last_execution_at)
        .sort(
          (a, b) =>
            new Date(b.last_execution_at!).getTime() -
            new Date(a.last_execution_at!).getTime(),
        )
        .slice(0, 5),
    [agents],
  );

  const recentExecutions = useMemo(
    () =>
      [...mockExecutions]
        .sort(
          (a, b) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
        )
        .slice(0, 5),
    [],
  );

  const getSuccessRate = (agentId: string) => {
    const agentExecs = mockExecutions.filter((e) => e.agent_id === agentId);
    if (agentExecs.length === 0) return 0;
    const successes = agentExecs.filter((e) => e.status === 'success').length;
    return Math.round((successes / agentExecs.length) * 100);
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="w-6 h-6 text-amber-accent" />
        <h1 className="text-2xl font-semibold text-gray-100">Dashboard</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Agents"
          value={stats.activeAgents}
          icon={Bot}
          color="green"
        />
        <StatCard
          label="Pending Review"
          value={stats.pendingReview}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Executions This Week"
          value={stats.executionsThisWeek}
          icon={Zap}
          color="blue"
        />
        <StatCard
          label="Estimated Cost"
          value={`$${stats.totalCost.toFixed(2)}`}
          icon={DollarSign}
          color="neutral"
        />
      </div>

      {/* Recent Agents */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-card-bg border border-card-border rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <h2 className="text-sm font-medium text-gray-300">Recent Agents</h2>
              <button
                onClick={() => navigate('/agents')}
                className="flex items-center gap-1 text-xs text-amber-accent hover:text-amber-accent-hover transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-card-border">
                    <th className="text-left font-medium px-5 py-3">Name</th>
                    <th className="text-left font-medium px-3 py-3">Status</th>
                    <th className="text-left font-medium px-3 py-3">Last Run</th>
                    <th className="text-right font-medium px-3 py-3">Runs</th>
                    <th className="text-right font-medium px-3 py-3">Success</th>
                    <th className="text-right font-medium px-5 py-3">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAgents.map((agent) => (
                    <tr
                      key={agent.id}
                      onClick={() => navigate(`/agents/${agent.id}`)}
                      className="border-b border-card-border last:border-b-0 hover:bg-sidebar-hover cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3 text-sm text-gray-200 font-medium">
                        {agent.name}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={agent.status} />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-400">
                        {agent.last_execution_at
                          ? formatDistanceToNow(new Date(agent.last_execution_at), {
                              addSuffix: true,
                            })
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-400 text-right">
                        {agent.execution_count}
                      </td>
                      <td className="px-3 py-3 text-sm text-right">
                        <span
                          className={
                            getSuccessRate(agent.id) >= 80
                              ? 'text-emerald-400'
                              : getSuccessRate(agent.id) >= 50
                                ? 'text-amber-400'
                                : 'text-red-400'
                          }
                        >
                          {getSuccessRate(agent.id)}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400 text-right">
                        ${agent.estimated_cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Executions */}
        <div>
          <div className="bg-card-bg border border-card-border rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <h2 className="text-sm font-medium text-gray-300">Recent Executions</h2>
              <button
                onClick={() => navigate('/executions')}
                className="flex items-center gap-1 text-xs text-amber-accent hover:text-amber-accent-hover transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-card-border">
              {recentExecutions.map((exec) => (
                <div
                  key={exec.id}
                  onClick={() => navigate(`/executions/${exec.id}`)}
                  className="px-5 py-3.5 hover:bg-sidebar-hover cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-200 font-medium truncate mr-2">
                      {exec.agent_name}
                    </span>
                    <StatusBadge status={exec.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="capitalize">{exec.trigger_type}</span>
                    <span>{formatDuration(exec.duration_ms)}</span>
                    <span>
                      {formatDistanceToNow(new Date(exec.started_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
