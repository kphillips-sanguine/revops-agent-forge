import { useState, useCallback, useEffect } from 'react';
import {
  X,
  Play,
  Loader2,
  ChevronDown,
  ChevronRight,
  Flag,
  Wrench,
  MessageSquare,
  AlertCircle,
  FlaskConical,
} from 'lucide-react';
import { simulateAgent } from '../../api/builder';
import { runMockSimulation, type SimulationResult } from '../../mocks/simulation';
import type { ExecutionStep } from '../../types/execution';

interface SimulationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  definition: string;
}

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
      return <Play className="w-3.5 h-3.5 text-emerald-400" />;
    case 'tool_call':
      return <Wrench className={`w-3.5 h-3.5 ${failed ? 'text-red-400' : 'text-blue-400'}`} />;
    case 'llm_call':
      return <MessageSquare className="w-3.5 h-3.5 text-purple-400" />;
    case 'complete':
      return <Flag className="w-3.5 h-3.5 text-emerald-400" />;
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  }
}

function SimTimelineStep({ step }: { step: ExecutionStep }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = step.tool_call && (step.tool_call.input || step.tool_call.output);

  const stepLabel =
    step.type === 'tool_call' && step.tool_call
      ? `Tool: ${step.tool_call.tool_name}`
      : step.type === 'llm_call'
        ? 'LLM Call'
        : step.type === 'start'
          ? 'Started'
          : step.type === 'complete'
            ? 'Completed'
            : 'Error';

  return (
    <div className="flex gap-3 pb-3 last:pb-0">
      <div className="flex flex-col items-center pt-0.5">
        <StepIcon type={step.type} status={step.status} />
        <div className="flex-1 w-px bg-card-border mt-1" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`flex items-center gap-2 ${hasDetails ? 'cursor-pointer' : ''}`}
          onClick={() => hasDetails && setExpanded(!expanded)}
        >
          <span className="text-xs font-medium text-gray-300">{stepLabel}</span>
          {step.duration_ms != null && (
            <span className="text-xs text-gray-600">{formatDuration(step.duration_ms)}</span>
          )}
          {hasDetails && (
            <span className="text-gray-600">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
          )}
        </div>
        {step.message && (
          <p className="text-xs text-gray-500 mt-0.5">{step.message}</p>
        )}
        {step.tool_call?.input_summary && (
          <p className="text-xs text-gray-500 mt-0.5">{step.tool_call.input_summary}</p>
        )}
        {expanded && step.tool_call && (
          <div className="mt-2 space-y-1.5">
            {step.tool_call.input && (
              <pre className="text-xs text-gray-400 font-mono bg-black/20 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(step.tool_call.input, null, 2)}
              </pre>
            )}
            {step.tool_call.output && (
              <pre className="text-xs text-gray-400 font-mono bg-black/20 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(step.tool_call.output, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SimulationPanel({ isOpen, onClose, definition }: SimulationPanelProps) {
  const [inputJson, setInputJson] = useState('{\n  \n}');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setResult(null);
    try {
      let inputContext: Record<string, unknown> = {};
      try {
        inputContext = JSON.parse(inputJson);
      } catch {
        // Use empty context on parse error
      }

      let simResult: SimulationResult;
      try {
        // Try real API first
        const apiResult = await simulateAgent({
          definition_md: definition,
          mock_inputs: inputContext,
        });
        // Convert API response to SimulationResult shape for the UI
        const steps: ExecutionStep[] = apiResult.timeline.map((entry, idx) => {
          const stepType = entry.action === 'start' ? 'start'
            : entry.action === 'tool_call' ? 'tool_call'
            : entry.action === 'llm_call' ? 'llm_call'
            : entry.action === 'complete' ? 'complete'
            : 'error';
          return {
            id: `api_step_${idx}`,
            type: stepType as ExecutionStep['type'],
            timestamp: entry.timestamp,
            duration_ms: entry.duration_ms,
            message: entry.message,
            status: entry.status as 'success' | 'failed' | undefined,
            tool_call: entry.tool_call ? {
              id: `api_tc_${idx}`,
              tool_name: entry.tool_call.tool_name,
              input_summary: entry.tool_call.input_summary,
              input: entry.tool_call.input,
              output: entry.tool_call.output,
              status: entry.tool_call.status as 'success' | 'failed' | 'skipped',
              duration_ms: entry.tool_call.duration_ms,
              started_at: entry.timestamp,
            } : undefined,
          };
        });
        const totalDuration = steps.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0);
        simResult = {
          status: apiResult.status as 'success' | 'failed',
          duration_ms: totalDuration,
          steps,
          output: typeof apiResult.output === 'object' && apiResult.output
            ? (apiResult.output as Record<string, unknown>).summary as string ?? JSON.stringify(apiResult.output)
            : String(apiResult.output ?? ''),
          total_tokens: apiResult.tokens_used,
          estimated_cost: apiResult.tokens_used * 0.000015,
          llm_calls: steps.filter((s) => s.type === 'llm_call').length || 1,
        };
      } catch {
        // Fall back to mock simulation if API is unavailable
        simResult = await runMockSimulation(definition, inputContext);
      }

      setResult(simResult);
    } finally {
      setIsRunning(false);
    }
  }, [definition, inputJson]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card-bg border border-card-border rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-border shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-accent" />
            <h2 className="text-lg font-medium text-gray-200">Simulation</h2>
            <span className="px-2 py-0.5 text-[10px] font-medium text-amber-accent bg-amber-accent/10 border border-amber-accent/20 rounded">
              Simulated
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-2">
              Input Context (JSON)
            </label>
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              className="w-full h-28 px-3 py-2 bg-black/30 border border-card-border rounded-lg text-sm text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-amber-accent/50 resize-none"
              spellCheck={false}
            />
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Simulation...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Simulation
              </>
            )}
          </button>

          {result && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 p-3 bg-white/[0.02] border border-card-border rounded-lg text-xs">
                <div>
                  <span className="text-gray-500">Status</span>
                  <div className="mt-0.5">
                    <span className={`font-medium ${result.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.status === 'success' ? 'Success' : 'Failed'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Duration</span>
                  <p className="text-gray-300 mt-0.5">{formatDuration(result.duration_ms)}</p>
                </div>
                <div>
                  <span className="text-gray-500">LLM Calls</span>
                  <p className="text-gray-300 mt-0.5">{result.llm_calls}</p>
                </div>
                <div>
                  <span className="text-gray-500">Tokens</span>
                  <p className="text-gray-300 mt-0.5">{result.total_tokens.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Est. Cost</span>
                  <p className="text-gray-300 mt-0.5">${result.estimated_cost.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-3">Simulated Timeline</h3>
                <div className="bg-black/20 border border-card-border rounded-lg p-4">
                  {result.steps.map((step) => (
                    <SimTimelineStep key={step.id} step={step} />
                  ))}
                </div>
              </div>

              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <p className="text-xs font-medium text-emerald-400 mb-1">Output</p>
                <p className="text-sm text-gray-300">{result.output}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
