import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import {
  Bot,
  Edit3,
  Send,
  Trash2,
  CheckCircle,
  XCircle,
  Power,
  PowerOff,
  Play,
  Save,
  ShieldCheck,
  X,
  Clock,
  User,
  GitBranch,
  Tag,
  Wrench,
  Calendar,
  BarChart3,
  Zap,
  DollarSign,
  FileText,
  History,
  GitCommit,
  Settings,
} from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import StatusBadge from '../components/StatusBadge';
import ValidationPanel, { validateAgentMd } from '../components/ValidationPanel';
import ExecutionHistoryTab from '../components/ExecutionHistoryTab';
import ModelSelector from '../components/ModelSelector';
import { useAgentStore } from '../stores/agentStore';
import { mockExecutions } from '../mocks/executions';
import type { AgentStatus } from '../types/agent';
import { formatDistanceToNow, format } from 'date-fns';

type TabId = 'definition' | 'executions' | 'versions' | 'settings';

const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: 'definition', label: 'Definition', icon: FileText },
  { id: 'executions', label: 'Execution History', icon: History },
  { id: 'versions', label: 'Versions', icon: GitCommit },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function parseMdField(content: string, pattern: RegExp): string | null {
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function parseToolsFromMd(content: string): string[] {
  const toolsMatch = content.match(/^##\s+Tools\s*\n([\s\S]*?)(?=^##\s|$)/m);
  if (!toolsMatch) return [];
  return [...toolsMatch[1].matchAll(/\*\*(\w+)\*\*/g)].map((m) => m[1]);
}

function parseScheduleFromMd(content: string): { type: string; expression: string; timezone?: string } | null {
  const scheduleMatch = content.match(/^##\s+Schedule\s*\n([\s\S]*?)(?=^##\s|$)/m);
  if (!scheduleMatch) return null;
  const block = scheduleMatch[1];
  const type = parseMdField(block, /\*\*Type:\*\*\s*(.+)/);
  const expression = parseMdField(block, /\*\*Expression:\*\*\s*(.+)/);
  const timezone = parseMdField(block, /\*\*Timezone:\*\*\s*(.+)/);
  return type ? { type, expression: expression || '', timezone: timezone || undefined } : null;
}

function parseConstraintsFromMd(content: string): string[] {
  const constraintsMatch = content.match(/^##\s+Constraints\s*\n([\s\S]*?)(?=^##\s|$)/m);
  if (!constraintsMatch) return [];
  return constraintsMatch[1]
    .split('\n')
    .map((l) => l.replace(/^-\s*/, '').trim())
    .filter(Boolean);
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agents, fetchAgents, getAgentById, updateAgentStatus, updateAgentDefinition } = useAgentStore();

  const [activeTab, setActiveTab] = useState<TabId>('definition');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [validationResults, setValidationResults] = useState<ReturnType<typeof validateAgentMd> | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  useEffect(() => {
    if (agents.length === 0) fetchAgents();
  }, [agents.length, fetchAgents]);

  const agent = id ? getAgentById(id) : undefined;

  useEffect(() => {
    document.title = agent ? `${agent.name} | AgentForge` : 'Agent | AgentForge';
  }, [agent]);

  useEffect(() => {
    if (agent) {
      setEditedContent(agent.definition_md);
      setSelectedModelId(agent.model_id || null);
    }
  }, [agent]);

  const agentExecutions = id
    ? mockExecutions.filter((e) => e.agent_id === id).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    : [];

  const handleStatusChange = useCallback((newStatus: AgentStatus) => {
    if (id) {
      updateAgentStatus(id, newStatus);
      const labels: Record<AgentStatus, string> = {
        draft: 'Returned to draft',
        pending_review: 'Submitted for review',
        approved: 'Agent approved',
        active: 'Agent activated',
        disabled: 'Agent disabled',
      };
      toast.success(labels[newStatus]);
    }
  }, [id, updateAgentStatus]);

  const handleSave = useCallback(() => {
    if (id) {
      updateAgentDefinition(id, editedContent);
      setIsEditing(false);
      toast.success('Definition saved');
    }
  }, [id, editedContent, updateAgentDefinition]);

  const handleValidate = useCallback(() => {
    const results = validateAgentMd(editedContent);
    setValidationResults(results);
    const errors = results.filter((r) => r.status === 'error').length;
    if (errors > 0) {
      toast.error(`Validation failed: ${errors} error(s)`);
    } else {
      toast.success('Validation passed');
    }
  }, [editedContent]);

  const handleReject = useCallback(() => {
    if (id) {
      updateAgentStatus(id, 'draft');
      setShowRejectModal(false);
      setRejectReason('');
      toast.success('Agent rejected and returned to draft');
    }
  }, [id, updateAgentStatus]);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing && id) handleSave();
      }
      if (e.key === 'Escape' && showRejectModal) {
        setShowRejectModal(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditing, id, handleSave, showRejectModal]);

  const canEdit = agent && (agent.status === 'draft' || agent.status === 'approved' || agent.status === 'disabled');

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">{agents.length === 0 ? 'Loading agent...' : 'Agent not found'}</p>
          <button
            onClick={() => navigate('/agents')}
            className="mt-3 text-sm text-amber-accent hover:text-amber-accent-hover"
          >
            Back to Agents
          </button>
        </div>
      </div>
    );
  }

  // Parse metadata from MD for sidebar
  const parsedTools = parseToolsFromMd(agent.definition_md);
  const parsedSchedule = parseScheduleFromMd(agent.definition_md);
  const parsedConstraints = parseConstraintsFromMd(agent.definition_md);

  // Compute quick stats
  const successCount = agentExecutions.filter((e) => e.status === 'success').length;
  const successRate = agentExecutions.length > 0 ? Math.round((successCount / agentExecutions.length) * 100) : 0;
  const avgDuration = agentExecutions.length > 0
    ? Math.round(agentExecutions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / agentExecutions.length / 1000)
    : 0;
  const totalCost = agentExecutions.reduce((sum, e) => sum + e.estimated_cost, 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/' },
          { label: 'Agents', to: '/agents' },
          { label: agent.name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-amber-accent/10 rounded-lg mt-0.5">
            <Bot className="w-6 h-6 text-amber-accent" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-gray-100">{agent.name}</h1>
              <StatusBadge status={agent.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                v{agent.version}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {agent.created_by}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Created {format(new Date(agent.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            {agent.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {agent.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 bg-white/[0.04] rounded">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lifecycle action buttons */}
        <div className="flex items-center gap-2">
          {agent.status === 'draft' && (
            <>
              {canEdit && (
                <button
                  onClick={() => { setActiveTab('definition'); setIsEditing(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 rounded-lg border border-card-border"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
              <button
                onClick={() => handleStatusChange('pending_review')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg"
              >
                <Send className="w-3.5 h-3.5" />
                Submit for Review
              </button>
              <button
                onClick={() => navigate('/agents')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 rounded-lg border border-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}
          {agent.status === 'pending_review' && (
            <>
              <button
                onClick={() => handleStatusChange('approved')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg border border-emerald-500/20"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 rounded-lg border border-red-500/20"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}
          {agent.status === 'approved' && (
            <>
              <button
                onClick={() => handleStatusChange('active')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg border border-emerald-500/20"
              >
                <Power className="w-3.5 h-3.5" />
                Activate
              </button>
              <button
                onClick={() => { setActiveTab('definition'); setIsEditing(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 rounded-lg border border-card-border"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            </>
          )}
          {agent.status === 'active' && (
            <>
              <button
                onClick={() => handleStatusChange('disabled')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 rounded-lg border border-red-500/20"
              >
                <PowerOff className="w-3.5 h-3.5" />
                Disable
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg"
              >
                <Play className="w-3.5 h-3.5" />
                Run Now
              </button>
            </>
          )}
          {agent.status === 'disabled' && (
            <>
              <button
                onClick={() => handleStatusChange('active')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg border border-emerald-500/20"
              >
                <Power className="w-3.5 h-3.5" />
                Re-activate
              </button>
              <button
                onClick={() => { setActiveTab('definition'); setIsEditing(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 rounded-lg border border-card-border"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-card-border">
        <nav className="flex gap-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'text-amber-accent border-amber-accent'
                    : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'definition' && (
        <DefinitionTab
          agent={agent}
          isEditing={isEditing}
          editedContent={editedContent}
          onContentChange={setEditedContent}
          onSave={handleSave}
          onValidate={handleValidate}
          onCancelEdit={() => {
            setIsEditing(false);
            setEditedContent(agent.definition_md);
            setValidationResults(null);
          }}
          onStartEdit={() => setIsEditing(true)}
          canEdit={!!canEdit}
          validationResults={validationResults}
          onCloseValidation={() => setValidationResults(null)}
          parsedTools={parsedTools}
          parsedSchedule={parsedSchedule}
          parsedConstraints={parsedConstraints}
          successRate={successRate}
          avgDuration={avgDuration}
          totalCost={totalCost}
          executionCount={agent.execution_count}
          selectedModelId={selectedModelId}
          onModelSelect={setSelectedModelId}
        />
      )}

      {activeTab === 'executions' && (
        <ExecutionHistoryTab
          executions={agentExecutions}
          onRunNow={agent.status === 'active' ? () => {} : undefined}
        />
      )}

      {activeTab === 'versions' && (
        <VersionsTab agent={agent} />
      )}

      {activeTab === 'settings' && (
        <SettingsTab agent={agent} />
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card-bg border border-card-border rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-200">Reject Agent</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Provide a reason for rejecting this agent. It will be returned to draft status.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 bg-black/30 border border-card-border rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-accent resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/20"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Definition Tab ──────────────────────────────────────────────

interface DefinitionTabProps {
  agent: ReturnType<typeof useAgentStore.getState>['agents'][0];
  isEditing: boolean;
  editedContent: string;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onValidate: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  canEdit: boolean;
  validationResults: ReturnType<typeof validateAgentMd> | null;
  onCloseValidation: () => void;
  parsedTools: string[];
  parsedSchedule: { type: string; expression: string; timezone?: string } | null;
  parsedConstraints: string[];
  successRate: number;
  avgDuration: number;
  totalCost: number;
  executionCount: number;
  selectedModelId: string | null;
  onModelSelect: (modelId: string) => void;
}

function DefinitionTab({
  isEditing,
  editedContent,
  onContentChange,
  onSave,
  onValidate,
  onCancelEdit,
  onStartEdit,
  canEdit,
  validationResults,
  onCloseValidation,
  parsedTools,
  parsedSchedule,
  parsedConstraints,
  successRate,
  avgDuration,
  totalCost,
  executionCount,
  selectedModelId,
  onModelSelect,
}: DefinitionTabProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Main editor area */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={onSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
                <button
                  onClick={onValidate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 rounded-lg border border-card-border"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Validate
                </button>
                <button
                  onClick={onCancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                {canEdit && (
                  <button
                    onClick={onStartEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 rounded-lg border border-card-border"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                <button
                  onClick={onValidate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 rounded-lg border border-card-border"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Validate
                </button>
              </>
            )}
          </div>
          <span className="text-xs text-gray-600">
            {isEditing ? 'Edit mode' : 'Read-only'}
          </span>
        </div>

        {/* Model Selector */}
        <div className="rounded-lg border border-card-border bg-zinc-900/50 px-3 py-2">
          <ModelSelector
            selectedModelId={selectedModelId}
            onModelSelect={onModelSelect}
            definitionMd={editedContent}
            compact
          />
        </div>

        {/* Monaco Editor */}
        <div className="border border-card-border rounded-lg overflow-hidden" style={{ height: '520px' }}>
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={editedContent}
            onChange={(value) => onContentChange(value || '')}
            theme="vs-dark"
            options={{
              readOnly: !isEditing,
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'on',
              fontSize: 13,
              scrollBeyondLastLine: false,
              renderLineHighlight: isEditing ? 'all' : 'none',
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
        </div>

        {/* Validation Panel */}
        {validationResults && (
          <ValidationPanel results={validationResults} onClose={onCloseValidation} />
        )}
      </div>

      {/* Sidebar panel */}
      <div className="lg:w-72 shrink-0 space-y-4">
        {/* Tools Used */}
        <div className="bg-card-bg border border-card-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-300">Tools</h4>
          </div>
          {parsedTools.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {parsedTools.map((tool) => (
                <span key={tool} className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                  {tool}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600">No tools parsed from definition</p>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-card-bg border border-card-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-300">Schedule</h4>
          </div>
          {parsedSchedule ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="text-gray-300 capitalize">{parsedSchedule.type}</span>
              </div>
              {parsedSchedule.expression && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Expression</span>
                  <span className="text-gray-300 font-mono">{parsedSchedule.expression}</span>
                </div>
              )}
              {parsedSchedule.timezone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Timezone</span>
                  <span className="text-gray-300">{parsedSchedule.timezone}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-600">No schedule defined</p>
          )}
        </div>

        {/* Constraints */}
        {parsedConstraints.length > 0 && (
          <div className="bg-card-bg border border-card-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-medium text-gray-300">Constraints</h4>
            </div>
            <div className="space-y-1.5">
              {parsedConstraints.map((c, i) => (
                <p key={i} className="text-xs text-gray-400">{c}</p>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="bg-card-bg border border-card-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-300">Quick Stats</h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Zap className="w-3 h-3" />
                Executions
              </span>
              <span className="text-gray-300">{executionCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-500">
                <CheckCircle className="w-3 h-3" />
                Success Rate
              </span>
              <span className={successRate >= 90 ? 'text-emerald-400' : successRate >= 70 ? 'text-amber-400' : 'text-red-400'}>
                {successRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-3 h-3" />
                Avg Duration
              </span>
              <span className="text-gray-300">{avgDuration}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-500">
                <DollarSign className="w-3 h-3" />
                Total Cost
              </span>
              <span className="text-gray-300">${totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Versions Tab ────────────────────────────────────────────────

function VersionsTab({ agent }: { agent: ReturnType<typeof useAgentStore.getState>['agents'][0] }) {
  // Mock version history based on the agent's current version
  const versions = Array.from({ length: agent.version }, (_, i) => ({
    version: agent.version - i,
    date: new Date(new Date(agent.created_at).getTime() + i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    author: agent.created_by,
    isCurrent: i === 0,
    changeNote: i === 0
      ? 'Current version'
      : i === 1
        ? 'Updated decision logic and constraints'
        : 'Initial draft',
  }));

  return (
    <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-card-border text-xs text-gray-500">
            <th className="px-4 py-2 text-left font-medium">Version</th>
            <th className="px-4 py-2 text-left font-medium">Date</th>
            <th className="px-4 py-2 text-left font-medium">Author</th>
            <th className="px-4 py-2 text-left font-medium">Notes</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.version} className="border-b border-card-border last:border-b-0 hover:bg-white/[0.02]">
              <td className="px-4 py-3 text-sm text-gray-200 font-mono">v{v.version}</td>
              <td className="px-4 py-3 text-sm text-gray-400">
                {formatDistanceToNow(new Date(v.date), { addSuffix: true })}
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">{v.author}</td>
              <td className="px-4 py-3 text-sm text-gray-400">{v.changeNote}</td>
              <td className="px-4 py-3">
                {v.isCurrent ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    Current
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border bg-gray-500/10 text-gray-400 border-gray-500/20">
                    Previous
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────────

function SettingsTab({ agent }: { agent: ReturnType<typeof useAgentStore.getState>['agents'][0] }) {
  return (
    <div className="space-y-6">
      {/* General Info */}
      <div className="bg-card-bg border border-card-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-200 mb-4">General Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-gray-500 text-xs block mb-1">Agent ID</label>
            <p className="text-gray-300 font-mono">{agent.id}</p>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Current Version</label>
            <p className="text-gray-300">v{agent.version}</p>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Created By</label>
            <p className="text-gray-300">{agent.created_by}</p>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Approved By</label>
            <p className="text-gray-300">{agent.approved_by || '—'}</p>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Created At</label>
            <p className="text-gray-300">{format(new Date(agent.created_at), 'MMM d, yyyy h:mm a')}</p>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Last Updated</label>
            <p className="text-gray-300">{format(new Date(agent.updated_at), 'MMM d, yyyy h:mm a')}</p>
          </div>
        </div>
      </div>

      {/* Schedule Settings */}
      <div className="bg-card-bg border border-card-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-200 mb-4">Schedule Configuration</h3>
        {agent.schedule ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Trigger Type</label>
              <p className="text-gray-300 capitalize">{agent.schedule.type}</p>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Expression / Value</label>
              <p className="text-gray-300 font-mono">{agent.schedule.value}</p>
            </div>
            {agent.schedule.timezone && (
              <div>
                <label className="text-gray-500 text-xs block mb-1">Timezone</label>
                <p className="text-gray-300">{agent.schedule.timezone}</p>
              </div>
            )}
            <div>
              <label className="text-gray-500 text-xs block mb-1">Enabled</label>
              <p className={agent.schedule.enabled ? 'text-emerald-400' : 'text-gray-500'}>
                {agent.schedule.enabled ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No schedule configured</p>
        )}
      </div>

      {/* Guardrails */}
      <div className="bg-card-bg border border-card-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-200 mb-4">Guardrails</h3>
        {agent.guardrails_md ? (
          <p className="text-sm text-gray-400">{agent.guardrails_md}</p>
        ) : (
          <p className="text-sm text-gray-500">No custom guardrails configured. Default platform guardrails apply.</p>
        )}
      </div>

      {/* Allowed Tools */}
      <div className="bg-card-bg border border-card-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-200 mb-4">Allowed Tools</h3>
        {agent.tools_allowed.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {agent.tools_allowed.map((tool) => (
              <span key={tool} className="px-3 py-1 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
                {tool}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No tools allowed</p>
        )}
      </div>
    </div>
  );
}
