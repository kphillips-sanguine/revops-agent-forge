import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  Plus,
  Save,
  ShieldCheck,
  RotateCcw,
  GripVertical,
} from 'lucide-react';
import BuilderChat from '../components/builder/BuilderChat';
import ToolBrowser from '../components/builder/ToolBrowser';
import ValidationPanel, { validateAgentMd } from '../components/ValidationPanel';
import { useBuilderStore } from '../stores/builderStore';
import { useAgentStore } from '../stores/agentStore';

export default function BuilderPage() {
  const navigate = useNavigate();
  const { currentDefinition, updateDefinition, reset } = useBuilderStore();
  const { agents, fetchAgents } = useAgentStore();

  const [toolBrowserOpen, setToolBrowserOpen] = useState(false);
  const [validationResults, setValidationResults] = useState<ReturnType<typeof validateAgentMd> | null>(null);
  const [splitPercent, setSplitPercent] = useState(40);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Ensure agent store is loaded for save-as-draft
  useEffect(() => {
    if (agents.length === 0) fetchAgents();
  }, [agents.length, fetchAgents]);

  // Debounced validation
  const validationTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!currentDefinition) {
      setValidationResults(null);
      return;
    }
    clearTimeout(validationTimer.current);
    validationTimer.current = setTimeout(() => {
      setValidationResults(validateAgentMd(currentDefinition));
    }, 500);
    return () => clearTimeout(validationTimer.current);
  }, [currentDefinition]);

  // Drag resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(25, Math.min(65, (x / rect.width) * 100));
      setSplitPercent(pct);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleValidate = useCallback(() => {
    if (currentDefinition) {
      setValidationResults(validateAgentMd(currentDefinition));
    }
  }, [currentDefinition]);

  const handleSaveAsDraft = useCallback(() => {
    if (!currentDefinition) return;

    // Parse agent name from the MD
    const nameMatch = currentDefinition.match(/^#\s+Agent:\s*(.+)/m);
    const name = nameMatch ? nameMatch[1].trim() : 'Untitled Agent';

    // Parse tools from MD
    const toolsMatch = currentDefinition.match(/^##\s+Tools\s*\n([\s\S]*?)(?=^##\s|$)/m);
    const toolsAllowed = toolsMatch
      ? [...toolsMatch[1].matchAll(/\*\*(\w+)\*\*/g)].map((m) => m[1])
      : [];

    // Parse tags from MD
    const tagsMatch = currentDefinition.match(/^##\s+Tags\s*\n(.+)/m);
    const tags = tagsMatch
      ? tagsMatch[1].split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const newId = `ag_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const newAgent = {
      id: newId,
      name,
      version: 1,
      status: 'draft' as const,
      definition_md: currentDefinition,
      guardrails_md: null,
      tools_allowed: toolsAllowed,
      schedule: null,
      tags,
      created_by: 'kevin@sanguinebio.com',
      approved_by: null,
      created_at: now,
      updated_at: now,
      last_execution_at: null,
      execution_count: 0,
      estimated_cost: 0,
    };

    // Add to agent store
    useAgentStore.setState((state) => ({
      agents: [...state.agents, newAgent],
    }));

    // Reset builder and navigate
    reset();
    navigate(`/agents/${newId}`);
  }, [currentDefinition, navigate, reset]);

  const handleReset = useCallback(() => {
    reset();
    setValidationResults(null);
  }, [reset]);

  return (
    <div className="flex flex-col h-[calc(100vh-73px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Plus className="w-5 h-5 text-amber-accent" />
          <h1 className="text-xl font-semibold text-gray-100">Builder</h1>
          {currentDefinition && (
            <span className="px-2 py-0.5 text-[10px] font-medium text-amber-accent bg-amber-accent/10 border border-amber-accent/20 rounded">
              Editing
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg border border-card-border transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleValidate}
            disabled={!currentDefinition}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg border border-card-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Validate
          </button>
          <button
            onClick={handleSaveAsDraft}
            disabled={!currentDefinition}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save as Draft
          </button>
        </div>
      </div>

      {/* Split Panel Container */}
      <div
        ref={containerRef}
        className="flex flex-1 min-h-0 border border-card-border rounded-lg overflow-hidden bg-card-bg"
      >
        {/* Left: Chat + Tool Browser */}
        <div
          className="flex flex-col min-w-0 border-r border-card-border"
          style={{ width: `${splitPercent}%` }}
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            <BuilderChat />
          </div>
          <ToolBrowser isOpen={toolBrowserOpen} onToggle={() => setToolBrowserOpen((o) => !o)} />
        </div>

        {/* Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="w-2 shrink-0 flex items-center justify-center cursor-col-resize hover:bg-amber-accent/10 active:bg-amber-accent/20 transition-colors group"
        >
          <GripVertical className="w-3 h-3 text-gray-700 group-hover:text-amber-accent/60" />
        </div>

        {/* Right: Editor + Validation */}
        <div
          className="flex flex-col min-w-0"
          style={{ width: `${100 - splitPercent}%` }}
        >
          {/* Editor */}
          <div className="flex-1 min-h-0">
            {currentDefinition ? (
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={currentDefinition}
                onChange={(value) => updateDefinition(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'all',
                  padding: { top: 12, bottom: 12 },
                  folding: true,
                  lineDecorationsWidth: 8,
                  overviewRulerLanes: 0,
                  hideCursorInOverviewRuler: true,
                  overviewRulerBorder: false,
                  scrollbar: {
                    verticalScrollbarSize: 6,
                    horizontalScrollbarSize: 6,
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600">
                <div className="text-center">
                  <p className="text-sm">No definition yet</p>
                  <p className="text-xs mt-1 text-gray-700">
                    Use the chat to generate an agent definition
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Validation Panel */}
          {validationResults && currentDefinition && (
            <div className="shrink-0 border-t border-card-border">
              <ValidationPanel
                results={validationResults}
                onClose={() => setValidationResults(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
