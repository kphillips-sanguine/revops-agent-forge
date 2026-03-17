import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cloud, Megaphone, FileText, DollarSign, HardDrive, Table2,
  ShoppingCart, FlaskConical, Database, CheckCircle, XCircle,
  Clock, Search, ArrowRight,
} from 'lucide-react';
import { fetchSystems } from '../../api/admin';
import { mockSystems } from '../../mocks/admin';
import type { ConnectedSystemSummary } from '../../types/admin';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  cloud: Cloud,
  megaphone: Megaphone,
  'file-text': FileText,
  'dollar-sign': DollarSign,
  'hard-drive': HardDrive,
  table: Table2,
  'shopping-cart': ShoppingCart,
  'flask-conical': FlaskConical,
  database: Database,
};

const CATEGORY_COLORS: Record<string, string> = {
  crm: 'bg-blue-500/20 text-blue-400',
  erp: 'bg-green-500/20 text-green-400',
  marketing: 'bg-purple-500/20 text-purple-400',
  storage: 'bg-cyan-500/20 text-cyan-400',
  ecommerce: 'bg-orange-500/20 text-orange-400',
  lims: 'bg-rose-500/20 text-rose-400',
  other: 'bg-gray-500/20 text-gray-400',
};

const STATUS_MAP: Record<string, { icon: React.FC<{ className?: string }>; color: string; label: string }> = {
  active: { icon: CheckCircle, color: 'text-emerald-400', label: 'Active' },
  inactive: { icon: XCircle, color: 'text-gray-500', label: 'Inactive' },
  coming_soon: { icon: Clock, color: 'text-amber-400', label: 'Coming Soon' },
};

export default function AdminSystemsPage() {
  const navigate = useNavigate();
  const [systems, setSystems] = useState<ConnectedSystemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSystems(true);
        setSystems(data);
      } catch {
        setSystems(mockSystems);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = systems.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Connected Systems</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage enterprise systems that agents can interact with
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search systems..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-card-border rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-accent"
        />
      </div>

      {/* System Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-zinc-900 rounded-xl animate-pulse border border-card-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((system) => {
            const IconComponent = ICON_MAP[system.icon] || Database;
            const statusInfo = STATUS_MAP[system.status] || STATUS_MAP.active;
            const StatusIcon = statusInfo.icon;
            const catColor = CATEGORY_COLORS[system.category] || CATEGORY_COLORS.other;
            const caps = system.capabilities;
            const capList = Object.entries(caps)
              .filter(([, v]) => v)
              .map(([k]) => k);

            return (
              <div
                key={system.id}
                onClick={() => navigate(`/admin/systems/${system.id}`)}
                className="bg-card-bg border border-card-border rounded-xl p-5 hover:border-amber-accent/40 transition-all cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-accent/10 flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-amber-accent" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                    <span className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>
                </div>

                {/* Name & Category */}
                <h3 className="text-base font-semibold text-gray-100 mb-1">{system.name}</h3>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${catColor}`}>
                  {system.category.toUpperCase()}
                </span>

                {/* Capabilities */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {capList.map((cap) => (
                    <span
                      key={cap}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400 border border-card-border"
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                {/* Hover arrow */}
                <div className="mt-3 flex items-center gap-1 text-xs text-gray-600 group-hover:text-amber-accent transition-colors">
                  <span>Configure</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
