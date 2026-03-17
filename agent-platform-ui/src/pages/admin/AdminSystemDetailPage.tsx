import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Trash2, FileText, Database as DbIcon,
  Link2, BookOpen, Shield, CheckCircle, XCircle,
} from 'lucide-react';
import { fetchSystem, fetchDocuments, createDocument, updateDocument, deleteDocument, fetchGuardrails, updateGuardrail } from '../../api/admin';
import type { ConnectedSystem, SystemDocument, GuardrailRule, DocType } from '../../types/admin';

const DOC_TYPES: { value: DocType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'architecture', label: 'Architecture', icon: FileText },
  { value: 'data_model', label: 'Data Model', icon: DbIcon },
  { value: 'integration_guide', label: 'Integration Guide', icon: Link2 },
  { value: 'api_reference', label: 'API Reference', icon: BookOpen },
];

type TabId = 'overview' | 'architecture' | 'data_model' | 'integration_guide' | 'api_reference' | 'guardrails';

export default function AdminSystemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [system, setSystem] = useState<ConnectedSystem | null>(null);
  const [documents, setDocuments] = useState<SystemDocument[]>([]);
  const [guardrails, setGuardrails] = useState<GuardrailRule[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<SystemDocument | null>(null);
  const [docContent, setDocContent] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [sys, docs, rules] = await Promise.all([
        fetchSystem(id),
        fetchDocuments(id),
        fetchGuardrails({ system_id: id }),
      ]);
      setSystem(sys);
      setDocuments(docs);
      setGuardrails(rules);
    } catch {
      toast.error('Failed to load system data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveDoc = async () => {
    if (!editingDoc || !id) return;
    setSaving(true);
    try {
      if (editingDoc.id.startsWith('new-')) {
        await createDocument(id, {
          doc_type: editingDoc.doc_type,
          title: editingDoc.title,
          content_md: docContent,
        });
        toast.success('Document created');
      } else {
        await updateDocument(editingDoc.id, { content_md: docContent });
        toast.success('Document saved');
      }
      await loadData();
    } catch {
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await deleteDocument(docId);
      toast.success('Document deleted');
      await loadData();
      setEditingDoc(null);
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleToggleGuardrail = async (rule: GuardrailRule) => {
    try {
      await updateGuardrail(rule.id, { enabled: !rule.enabled });
      toast.success(`Guardrail ${rule.enabled ? 'disabled' : 'enabled'}`);
      await loadData();
    } catch {
      toast.error('Failed to update guardrail');
    }
  };

  const openDocTab = (docType: DocType) => {
    const existing = documents.find((d) => d.doc_type === docType);
    if (existing) {
      setEditingDoc(existing);
      setDocContent(existing.content_md);
    } else {
      const typeInfo = DOC_TYPES.find((t) => t.value === docType);
      setEditingDoc({
        id: `new-${docType}`,
        system_id: id || '',
        doc_type: docType,
        title: `${system?.name || ''} ${typeInfo?.label || docType}`,
        content_md: '',
        version: 1,
        updated_by: '',
        created_at: '',
        updated_at: '',
      });
      setDocContent('');
    }
    setActiveTab(docType as TabId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
        <div className="h-64 bg-zinc-900 rounded-xl animate-pulse border border-card-border" />
      </div>
    );
  }

  if (!system) {
    return <div className="text-gray-400">System not found</div>;
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'data_model', label: 'Data Model' },
    { id: 'integration_guide', label: 'Integration' },
    { id: 'api_reference', label: 'API Reference' },
    { id: 'guardrails', label: 'Guardrails' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/systems')} className="text-gray-400 hover:text-gray-200">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{system.name}</h1>
          <p className="text-sm text-gray-400">{system.description}</p>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-card-border">
        {tabs.map((tab) => {
          const hasDoc = documents.some((d) => d.doc_type === tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => tab.id === 'overview' || tab.id === 'guardrails' ? setActiveTab(tab.id) : openDocTab(tab.id as DocType)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-amber-accent border-amber-accent'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.id !== 'overview' && tab.id !== 'guardrails' && hasDoc && (
                <CheckCircle className="inline w-3 h-3 ml-1.5 text-emerald-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Info */}
          <div className="bg-card-bg border border-card-border rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-100">System Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Category</span>
                <span className="text-gray-200 capitalize">{system.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`capitalize ${system.status === 'active' ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {system.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Auth Type</span>
                <span className="text-gray-200">{system.auth_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Credential Ref</span>
                <code className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-amber-accent">
                  {system.credential_ref || 'Not set'}
                </code>
              </div>
              {system.base_url && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Base URL</span>
                  <span className="text-gray-200 text-xs">{system.base_url}</span>
                </div>
              )}
            </div>
          </div>

          {/* Capabilities */}
          <div className="bg-card-bg border border-card-border rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-100">Capabilities</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(system.capabilities).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  {val ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-600" />
                  )}
                  <span className={`text-sm capitalize ${val ? 'text-gray-200' : 'text-gray-500'}`}>
                    {key}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Summary */}
          <div className="bg-card-bg border border-card-border rounded-xl p-5 space-y-4 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-100">Documentation</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DOC_TYPES.map((dt) => {
                const doc = documents.find((d) => d.doc_type === dt.value);
                const Icon = dt.icon;
                return (
                  <button
                    key={dt.value}
                    onClick={() => openDocTab(dt.value)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-card-border bg-zinc-900/50 hover:border-amber-accent/40 transition-colors text-left"
                  >
                    <Icon className={`w-5 h-5 ${doc ? 'text-amber-accent' : 'text-gray-600'}`} />
                    <div>
                      <div className="text-sm text-gray-200">{dt.label}</div>
                      <div className="text-xs text-gray-500">
                        {doc ? `v${doc.version} · ${new Date(doc.updated_at).toLocaleDateString()}` : 'Not configured'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Document Editor Tabs */}
      {(activeTab === 'architecture' || activeTab === 'data_model' || activeTab === 'integration_guide' || activeTab === 'api_reference') && editingDoc && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-100">{editingDoc.title}</h2>
            <div className="flex items-center gap-2">
              {!editingDoc.id.startsWith('new-') && (
                <button
                  onClick={() => handleDeleteDoc(editingDoc.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
              <button
                onClick={handleSaveDoc}
                disabled={saving}
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
              value={docContent}
              onChange={(v) => setDocContent(v || '')}
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
          {!editingDoc.id.startsWith('new-') && (
            <p className="text-xs text-gray-600">
              Version {editingDoc.version} · Last updated by {editingDoc.updated_by} on{' '}
              {new Date(editingDoc.updated_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Guardrails Tab */}
      {activeTab === 'guardrails' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-100">System-Specific Guardrails</h2>
          </div>
          {guardrails.length === 0 ? (
            <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
              <Shield className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No system-specific guardrails configured</p>
              <p className="text-xs text-gray-600 mt-1">Global guardrails still apply to this system</p>
            </div>
          ) : (
            <div className="space-y-2">
              {guardrails.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between bg-card-bg border border-card-border rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      rule.rule_type === 'block' ? 'bg-red-500/20 text-red-400'
                        : rule.rule_type === 'warn' ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {rule.rule_type.toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm text-gray-200">{rule.name}</div>
                      <div className="text-xs text-gray-500">{rule.description}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleGuardrail(rule)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      rule.enabled ? 'bg-amber-accent' : 'bg-zinc-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      rule.enabled ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
