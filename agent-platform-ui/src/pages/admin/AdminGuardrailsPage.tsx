import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Shield, ShieldCheck, Eye, Plus, Trash2, Search,
  AlertTriangle, Ban,
} from 'lucide-react';
import { fetchGuardrails, createGuardrail, updateGuardrail, deleteGuardrail } from '../../api/admin';
import { mockGuardrails } from '../../mocks/admin';
import type { GuardrailRule, GuardrailCategory, GuardrailRuleType } from '../../types/admin';

const CATEGORY_LABELS: Record<GuardrailCategory, { label: string; color: string }> = {
  data_access: { label: 'Data Access', color: 'bg-blue-500/20 text-blue-400' },
  pii: { label: 'PII', color: 'bg-red-500/20 text-red-400' },
  rate_limit: { label: 'Rate Limit', color: 'bg-yellow-500/20 text-yellow-400' },
  cost: { label: 'Cost', color: 'bg-green-500/20 text-green-400' },
  compliance: { label: 'Compliance', color: 'bg-purple-500/20 text-purple-400' },
  safety: { label: 'Safety', color: 'bg-orange-500/20 text-orange-400' },
};

const RULE_TYPE_INFO: Record<GuardrailRuleType, { icon: React.FC<{ className?: string }>; color: string }> = {
  block: { icon: Ban, color: 'text-red-400 bg-red-500/10' },
  warn: { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10' },
  log: { icon: Eye, color: 'text-blue-400 bg-blue-500/10' },
};

export default function AdminGuardrailsPage() {
  const [rules, setRules] = useState<GuardrailRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    category: 'safety' as GuardrailCategory,
    rule_type: 'warn' as GuardrailRuleType,
    scope: 'global' as const,
    priority: 100,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchGuardrails();
        setRules(data);
      } catch {
        setRules(mockGuardrails);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleToggle = async (rule: GuardrailRule) => {
    try {
      await updateGuardrail(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
      toast.success(`Guardrail ${rule.enabled ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to update guardrail');
    }
  };

  const handleCreate = async () => {
    if (!newRule.name.trim()) return;
    try {
      const created = await createGuardrail(newRule);
      setRules((prev) => [...prev, created]);
      setShowCreate(false);
      setNewRule({ name: '', description: '', category: 'safety', rule_type: 'warn', scope: 'global', priority: 100 });
      toast.success('Guardrail created');
    } catch {
      toast.error('Failed to create guardrail');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGuardrail(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success('Guardrail deleted');
    } catch {
      toast.error('Failed to delete guardrail');
    }
  };

  const filtered = rules
    .filter((r) => filterCategory === 'all' || r.category === filterCategory)
    .filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.priority - b.priority);

  const stats = {
    total: rules.length,
    blocking: rules.filter((r) => r.rule_type === 'block' && r.enabled).length,
    warnings: rules.filter((r) => r.rule_type === 'warn' && r.enabled).length,
    logging: rules.filter((r) => r.rule_type === 'log' && r.enabled).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Guardrails</h1>
          <p className="text-sm text-gray-400 mt-1">
            Rules that govern agent behavior across all systems
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Rules', value: stats.total, icon: Shield, color: 'text-gray-400' },
          { label: 'Blocking', value: stats.blocking, icon: Ban, color: 'text-red-400' },
          { label: 'Warnings', value: stats.warnings, icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Logging', value: stats.logging, icon: Eye, color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="bg-card-bg border border-card-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <span className="text-2xl font-bold text-gray-100">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search guardrails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-card-border rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-accent"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-card-border rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-accent"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="bg-card-bg border border-amber-accent/30 rounded-xl p-5 space-y-4">
          <h3 className="text-lg font-semibold text-gray-100">New Guardrail Rule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-900 border border-card-border rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-accent"
                placeholder="Rule name..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select
                value={newRule.category}
                onChange={(e) => setNewRule({ ...newRule, category: e.target.value as GuardrailCategory })}
                className="w-full px-3 py-2 bg-zinc-900 border border-card-border rounded-lg text-sm text-gray-200"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Action</label>
              <select
                value={newRule.rule_type}
                onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value as GuardrailRuleType })}
                className="w-full px-3 py-2 bg-zinc-900 border border-card-border rounded-lg text-sm text-gray-200"
              >
                <option value="block">Block</option>
                <option value="warn">Warn</option>
                <option value="log">Log</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Priority (1-1000)</label>
              <input
                type="number"
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 100 })}
                className="w-full px-3 py-2 bg-zinc-900 border border-card-border rounded-lg text-sm text-gray-200"
                min={1}
                max={1000}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-900 border border-card-border rounded-lg text-sm text-gray-200 resize-none"
                rows={2}
                placeholder="What does this rule enforce?"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newRule.name.trim()}
              className="px-3 py-1.5 text-sm bg-amber-accent hover:bg-amber-accent-hover text-black font-medium rounded-lg disabled:opacity-50"
            >
              Create Rule
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900 rounded-lg animate-pulse border border-card-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No guardrails match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rule) => {
            const typeInfo = RULE_TYPE_INFO[rule.rule_type];
            const TypeIcon = typeInfo.icon;
            const catInfo = CATEGORY_LABELS[rule.category] || CATEGORY_LABELS.safety;

            return (
              <div
                key={rule.id}
                className={`flex items-center justify-between bg-card-bg border border-card-border rounded-lg px-4 py-3 ${
                  !rule.enabled ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{rule.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                      {rule.scope === 'system' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{rule.description}</p>
                  </div>
                  <span className="text-xs text-gray-600 mr-4">P{rule.priority}</span>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors mr-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      rule.enabled ? 'bg-amber-accent' : 'bg-zinc-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      rule.enabled ? 'left-5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
