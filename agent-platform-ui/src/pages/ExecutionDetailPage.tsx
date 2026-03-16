import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Zap,
  Clock,
  DollarSign,
  MessageSquare,
  Hash,
  GitBranch,
  Shield,
  ChevronDown,
  ChevronRight,
  Play,
  Wrench,
  Flag,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import Breadcrumbs from '../components/Breadcrumbs';
import StatusBadge from '../components/StatusBadge';
import { useExecutionStore } from '../stores/executionStore';
import type { ExecutionStep } from '../types/execution';

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}m ${remainingSec}s`;
}

function StepIcon({ type, status }: { type: ExecutionStep['type']; status?: string }) {
  const failed = status === 'failed';
  switch (type) {
    case 'start':
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <Play className="w-4 h-4 text-emerald-400" />
        </div>
      );
    case 'tool_call':
      return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${failed ? 'bg-red-500/15' : 'bg-blue-500/15'}`}>
          <Wrench className={`w-4 h-4 ${failed ? 'text-red-400' : 'text-blue-400'}`} />
        </div>
      );
    case 'llm_call':
      return (
        <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-purple-400" />
        </div>
      );
    case 'complete':
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <Flag className="w-4 h-4 text-emerald-400" />
        </div>
      );
    case 'error':
      return (
        <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-red-400" />
        </div>
      );
  }
}

function TimelineStep({ step }: { step: ExecutionStep }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = step.tool_call && (step.tool_call.input || step.tool_call.output);

  const stepLabel =
    step.type === 'tool_call' && step.tool_call
      ? `Tool Call: ${step.tool_call.tool_name}`
      : step.type === 'llm_call'
        ? 'LLM Call'
        : step.type === 'start'
          ? 'Started'
          : step.type === 'complete'
            ? 'Completed'
            : 'Error';

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <StepIcon type={step.type} status={step.status} />
        <div className="flex-1 w-px bg-card-border mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div
          className={`flex items-center gap-2 ${hasDetails ? 'cursor-pointer' : ''}`}
          onClick={() => hasDetails && setExpanded(!expanded)}
        >
          <span className="text-sm font-medium text-gray-200">{stepLabel}</span>
          {step.duration_ms != null && (
            <span className="text-xs text-gray-500">{formatDuration(step.duration_ms)}</span>
          )}
          {step.status === 'failed' && (
            <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">
              Failed
            </span>
          )}
          {hasDetails && (
            <span className="text-gray-600">
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>

        {step.tool_call?.input_summary && (
          <p className="text-xs text-gray-500 mt-1">{step.tool_call.input_summary}</p>
        )}
        {step.message && (
          <p className="text-xs text-gray-500 mt-1">{step.message}</p>
        )}
        {step.tool_call?.error && (
          <p className="text-xs text-red-400 mt-1">{step.tool_call.error}</p>
        )}

        <p className="text-xs text-gray-600 mt-1">
          {format(new Date(step.timestamp), 'HH:mm:ss.SSS')}
        </p>

        {/* Expanded details */}
        {expanded && step.tool_call && (
          <div className="mt-3 space-y-2">
            {step.tool_call.input && (
              <div className="bg-black/20 border border-card-border rounded-lg p-3">
                <p className="text-xs font-medium text-gray-400 mb-1.5">Input</p>
                <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono">
                  {JSON.stringify(step.tool_call.input, null, 2)}
                </pre>
              </div>
            )}
            {step.tool_call.output && (
              <div className="bg-black/20 border border-card-border rounded-lg p-3">
                <p className="text-xs font-medium text-gray-400 mb-1.5">Output</p>
                <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono">
                  {JSON.stringify(step.tool_call.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExecutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { executions, fetchExecutions, getExecutionById } = useExecutionStore();
  const [showRawOutput, setShowRawOutput] = useState(false);

  useEffect(() => {
    if (executions.length === 0) fetchExecutions();
  }, [executions.length, fetchExecutions]);

  const execution = id ? getExecutionById(id) : undefined;

  useEffect(() => {
    if (execution) {
      document.title = `Execution ${execution.id} | AgentForge`;
    }
  }, [execution]);

  if (!execution) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">
            {executions.length === 0 ? 'Loading execution...' : 'Execution not found'}
          </p>
          <button
            onClick={() => navigate('/executions')}
            className="mt-3 text-sm text-amber-accent hover:text-amber-accent-hover"
          >
            Back to Executions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/' },
          { label: 'Executions', to: '/executions' },
          { label: `${execution.agent_name} — ${execution.id}` },
        ]}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-gray-100">{execution.agent_name}</h1>
          <StatusBadge status={execution.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="flex items-center gap-1 font-mono">
            <Hash className="w-3.5 h-3.5" />
            {execution.id}
          </span>
          <span className="flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5" />
            v{execution.agent_version}
          </span>
          <span className="flex items-center gap-1 capitalize">
            <Zap className="w-3.5 h-3.5" />
            {execution.trigger_type}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main timeline */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card-bg border border-card-border rounded-lg p-6">
            <h2 className="text-sm font-medium text-gray-300 mb-5">Execution Timeline</h2>
            {execution.steps.length > 0 ? (
              <div>
                {execution.steps.map((step) => (
                  <TimelineStep key={step.id} step={step} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 py-4 text-center">
                No detailed step data available for this execution.
              </p>
            )}
          </div>

          {(execution.output || execution.error) && (
            <div className="bg-card-bg border border-card-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-300">Output</h2>
                <button
                  onClick={() => setShowRawOutput(!showRawOutput)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showRawOutput ? 'Formatted' : 'Raw JSON'}
                </button>
              </div>

              {execution.error && (
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 mb-3">
                  <p className="text-xs font-medium text-red-400 mb-1">Error</p>
                  <p className="text-sm text-red-300">{execution.error}</p>
                </div>
              )}

              {execution.output && (
                <div>
                  {showRawOutput ? (
                    <pre className="text-xs text-gray-300 font-mono bg-black/20 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify({ output: execution.output, input_context: execution.input_context }, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-gray-300">{execution.output}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metadata sidebar */}
        <div className="space-y-4">
          <div className="bg-card-bg border border-card-border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Details</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Clock className="w-3 h-3" />
                  Duration
                </span>
                <span className="text-gray-300">{formatDuration(execution.duration_ms)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <MessageSquare className="w-3 h-3" />
                  LLM Calls
                </span>
                <span className="text-gray-300">{execution.llm_calls}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Hash className="w-3 h-3" />
                  Total Tokens
                </span>
                <span className="text-gray-300">{execution.total_tokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <DollarSign className="w-3 h-3" />
                  Estimated Cost
                </span>
                <span className="text-gray-300">${execution.estimated_cost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Zap className="w-3 h-3" />
                  Trigger
                </span>
                <span className="text-gray-300 capitalize">{execution.trigger_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <GitBranch className="w-3 h-3" />
                  Agent Version
                </span>
                <span className="text-gray-300">v{execution.agent_version}</span>
              </div>
              {execution.started_at && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Clock className="w-3 h-3" />
                    Started
                  </span>
                  <span className="text-gray-300">
                    {format(new Date(execution.started_at), 'MMM d, HH:mm:ss')}
                  </span>
                </div>
              )}
              {execution.completed_at && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Flag className="w-3 h-3" />
                    Completed
                  </span>
                  <span className="text-gray-300">
                    {format(new Date(execution.completed_at), 'MMM d, HH:mm:ss')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {execution.guardrails_applied.length > 0 && (
            <div className="bg-card-bg border border-card-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-300">Guardrails Applied</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {execution.guardrails_applied.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(execution.input_context).length > 0 && (
            <div className="bg-card-bg border border-card-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Input Context</h3>
              <pre className="text-xs text-gray-400 font-mono bg-black/20 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(execution.input_context, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
