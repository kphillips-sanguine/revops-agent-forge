import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronRight, Play, Wrench, MessageSquare, Flag, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { Execution, ExecutionStep } from '../types/execution';

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}m ${remainingSec}s`;
}

function StepIcon({ type }: { type: ExecutionStep['type'] }) {
  switch (type) {
    case 'start':
      return <Play className="w-3.5 h-3.5 text-emerald-400" />;
    case 'tool_call':
      return <Wrench className="w-3.5 h-3.5 text-blue-400" />;
    case 'llm_call':
      return <MessageSquare className="w-3.5 h-3.5 text-purple-400" />;
    case 'complete':
      return <Flag className="w-3.5 h-3.5 text-emerald-400" />;
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  }
}

function ExecutionRow({ execution }: { execution: Execution }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-white/[0.02] cursor-pointer border-b border-card-border"
      >
        <td className="px-4 py-3 text-xs font-mono text-gray-400">{execution.id}</td>
        <td className="px-4 py-3 text-xs text-gray-400 capitalize">{execution.trigger_type}</td>
        <td className="px-4 py-3">
          <StatusBadge status={execution.status} />
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">{formatDuration(execution.duration_ms)}</td>
        <td className="px-4 py-3 text-xs text-gray-400">{execution.total_tokens.toLocaleString()}</td>
        <td className="px-4 py-3 text-xs text-gray-400">${execution.estimated_cost.toFixed(2)}</td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {formatDistanceToNow(new Date(execution.started_at), { addSuffix: true })}
        </td>
        <td className="px-4 py-3 text-gray-500">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-4 py-3 bg-black/20">
            {execution.output && (
              <div className="mb-3 p-3 rounded bg-card-bg border border-card-border">
                <p className="text-xs font-medium text-gray-400 mb-1">Output</p>
                <p className="text-sm text-gray-200">{execution.output}</p>
              </div>
            )}
            {execution.error && (
              <div className="mb-3 p-3 rounded bg-red-500/5 border border-red-500/20">
                <p className="text-xs font-medium text-red-400 mb-1">Error</p>
                <p className="text-sm text-red-300">{execution.error}</p>
              </div>
            )}
            {execution.steps.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 mb-2">Execution Timeline</p>
                {execution.steps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3 py-1.5">
                    <div className="mt-0.5">
                      <StepIcon type={step.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-300 capitalize">
                          {step.type === 'tool_call' && step.tool_call
                            ? `Tool: ${step.tool_call.tool_name}`
                            : step.type === 'llm_call'
                              ? 'LLM Call'
                              : step.type.charAt(0).toUpperCase() + step.type.slice(1)}
                        </span>
                        {step.duration_ms && (
                          <span className="text-xs text-gray-600">{formatDuration(step.duration_ms)}</span>
                        )}
                        {step.status === 'failed' && (
                          <span className="text-xs text-red-400">Failed</span>
                        )}
                      </div>
                      {step.tool_call && (
                        <p className="text-xs text-gray-500 mt-0.5">{step.tool_call.input_summary}</p>
                      )}
                      {step.message && (
                        <p className="text-xs text-gray-500 mt-0.5">{step.message}</p>
                      )}
                      {step.tool_call?.error && (
                        <p className="text-xs text-red-400 mt-0.5">{step.tool_call.error}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 shrink-0">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600">No detailed step data available for this execution.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

interface ExecutionHistoryTabProps {
  executions: Execution[];
  onRunNow?: () => void;
}

export default function ExecutionHistoryTab({ executions, onRunNow }: ExecutionHistoryTabProps) {
  if (executions.length === 0) {
    return (
      <div className="bg-card-bg border border-card-border rounded-lg p-8 text-center">
        <p className="text-gray-500 mb-3">No executions yet for this agent.</p>
        {onRunNow && (
          <button
            onClick={onRunNow}
            className="px-4 py-2 text-sm bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg"
          >
            Run Now
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{executions.length} executions</p>
        {onRunNow && (
          <button
            onClick={onRunNow}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg"
          >
            <Play className="w-3.5 h-3.5" />
            Run Now
          </button>
        )}
      </div>
      <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border text-xs text-gray-500">
              <th className="px-4 py-2 text-left font-medium">ID</th>
              <th className="px-4 py-2 text-left font-medium">Trigger</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Duration</th>
              <th className="px-4 py-2 text-left font-medium">Tokens</th>
              <th className="px-4 py-2 text-left font-medium">Cost</th>
              <th className="px-4 py-2 text-left font-medium">Started</th>
              <th className="px-4 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {executions.map((execution) => (
              <ExecutionRow key={execution.id} execution={execution} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
