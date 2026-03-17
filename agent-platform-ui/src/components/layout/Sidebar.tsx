import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Plus,
  Bot,
  Zap,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Server,
  BookOpen,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/builder', icon: Plus, label: 'Builder' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/executions', icon: Zap, label: 'Executions' },
  { to: '/tools', icon: Wrench, label: 'Tools' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const adminItems = [
  { to: '/admin/systems', icon: Server, label: 'Systems' },
  { to: '/admin/guardrails', icon: Shield, label: 'Guardrails' },
  { to: '/admin/context', icon: BookOpen, label: 'Context' },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'revops';

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-sidebar-bg border-r border-card-border flex flex-col z-30 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo area */}
      <div className="h-14 flex items-center px-4 border-b border-card-border">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-amber-accent flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-gray-950" />
          </div>
          {!collapsed && (
            <span className="text-base font-semibold text-gray-100 whitespace-nowrap">
              AgentForge
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-accent/10 text-amber-accent'
                  : 'text-gray-400 hover:bg-sidebar-hover hover:text-gray-200'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <span className="whitespace-nowrap">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Admin Section */}
      {isAdmin && (
        <div className="px-2 pb-3 border-t border-card-border pt-3">
          {!collapsed && (
            <div className="flex items-center gap-1.5 px-3 mb-2">
              <Lock className="w-3 h-3 text-gray-600" />
              <span className="text-[10px] uppercase tracking-wider text-gray-600 font-medium">
                Admin
              </span>
            </div>
          )}
          <div className="space-y-1">
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-accent/10 text-amber-accent'
                      : 'text-gray-500 hover:bg-sidebar-hover hover:text-gray-300'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && (
                  <span className="whitespace-nowrap text-xs">{item.label}</span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="h-12 flex items-center justify-center border-t border-card-border text-gray-500 hover:text-gray-300 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
