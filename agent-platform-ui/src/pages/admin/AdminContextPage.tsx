import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import {
  Building2, Users, GitBranch, BookOpen, ArrowRightLeft,
  ShieldCheck, Save,
} from 'lucide-react';
import { fetchBusinessContextList, upsertBusinessContext } from '../../api/admin';
import { mockBusinessContext } from '../../mocks/admin';
import type { BusinessContext, ContextKey } from '../../types/admin';

const CONTEXT_SECTIONS: { key: ContextKey; label: string; icon: React.FC<{ className?: string }>; description: string }[] = [
  { key: 'company_overview', label: 'Company Overview', icon: Building2, description: 'Company mission, business lines, revenue model, key metrics' },
  { key: 'org_structure', label: 'Organization', icon: Users, description: 'Departments, key roles, team structure' },
  { key: 'processes', label: 'Business Processes', icon: GitBranch, description: 'Lead-to-cash, support, inventory, and other key workflows' },
  { key: 'terminology', label: 'Terminology', icon: BookOpen, description: 'Business terms, acronyms, and definitions agents should know' },
  { key: 'data_flow', label: 'Data Flows', icon: ArrowRightLeft, description: 'How data moves between systems, integration map' },
  { key: 'compliance', label: 'Compliance', icon: ShieldCheck, description: 'Regulatory requirements, data handling rules, AI-specific governance' },
];

export default function AdminContextPage() {
  const [contexts, setContexts] = useState<BusinessContext[]>([]);
  const [_loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<ContextKey>('company_overview');
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchBusinessContextList();
        setContexts(data);
      } catch {
        setContexts(mockBusinessContext);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const ctx = contexts.find((c) => c.context_key === activeKey);
    if (ctx) {
      setEditContent(ctx.content_md);
      setEditTitle(ctx.title);
    } else {
      const section = CONTEXT_SECTIONS.find((s) => s.key === activeKey);
      setEditContent('');
      setEditTitle(section?.label || activeKey);
    }
    setDirty(false);
  }, [activeKey, contexts]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await upsertBusinessContext(activeKey, {
        title: editTitle,
        content_md: editContent,
      });
      setContexts((prev) => {
        const idx = prev.findIndex((c) => c.context_key === activeKey);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = result;
          return updated;
        }
        return [...prev, result];
      });
      setDirty(false);
      toast.success('Context saved');
    } catch {
      toast.error('Failed to save context');
    } finally {
      setSaving(false);
    }
  };

  const activeSection = CONTEXT_SECTIONS.find((s) => s.key === activeKey)!;
  const activeContext = contexts.find((c) => c.context_key === activeKey);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Business Context</h1>
        <p className="text-sm text-gray-400 mt-1">
          Define company knowledge that the Builder AI uses to generate better agents
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0 space-y-1">
          {CONTEXT_SECTIONS.map((section) => {
            const Icon = section.icon;
            const hasContent = contexts.some(
              (c) => c.context_key === section.key && c.content_md.trim().length > 0
            );
            const isActive = activeKey === section.key;

            return (
              <button
                key={section.key}
                onClick={() => setActiveKey(section.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  isActive
                    ? 'bg-amber-accent/10 text-amber-accent'
                    : 'text-gray-400 hover:bg-zinc-800 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{section.label}</div>
                  {hasContent && (
                    <div className="text-[10px] text-emerald-400 mt-0.5">Configured</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">{activeSection.label}</h2>
              <p className="text-xs text-gray-500">{activeSection.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {dirty && (
                <span className="text-xs text-amber-accent">Unsaved changes</span>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="border border-card-border rounded-lg overflow-hidden" style={{ height: '520px' }}>
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={editContent}
              onChange={(v) => {
                setEditContent(v || '');
                setDirty(true);
              }}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                lineNumbers: 'on',
                fontSize: 13,
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {activeContext && (
            <p className="text-xs text-gray-600">
              Version {activeContext.version} · Last updated by {activeContext.updated_by} on{' '}
              {new Date(activeContext.updated_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
