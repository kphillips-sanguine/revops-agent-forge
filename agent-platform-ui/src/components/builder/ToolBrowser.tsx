import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Database,
  PenSquare,
  MessageSquare,
  Mail,
  Sheet,
  Wrench,
} from 'lucide-react';
import { mockTools } from '../../mocks/tools';
import type { Tool, ToolTier } from '../../types/tool';

const ICON_MAP: Record<string, typeof Database> = {
  Database,
  PenSquare,
  MessageSquare,
  Mail,
  Sheet,
};

function tierColor(tier: ToolTier): string {
  switch (tier) {
    case 'read':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'write':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'admin':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
  }
}

function ToolCard({ tool }: { tool: Tool }) {
  const [expanded, setExpanded] = useState(false);
  const IconComponent = (tool.icon && ICON_MAP[tool.icon]) || Wrench;

  return (
    <div className="bg-black/20 border border-card-border rounded-lg p-3 hover:border-card-border/80 transition-colors">
      <div
        className="flex items-start gap-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="shrink-0 w-7 h-7 rounded bg-white/[0.04] flex items-center justify-center mt-0.5">
          <IconComponent className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-300 truncate">{tool.display_name}</span>
            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded border ${tierColor(tool.tier)}`}>
              {tool.tier}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{tool.description}</p>
        </div>
      </div>

      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-card-border">
          <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">Parameters</p>
          <div className="space-y-1">
            {tool.parameters.map((param) => (
              <div key={param.name} className="flex items-baseline gap-2 text-[11px]">
                <code className="text-blue-400 font-mono">{param.name}</code>
                <span className="text-gray-600">{param.type}</span>
                {param.required && (
                  <span className="text-red-400 text-[9px]">required</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
            <span>Category: {tool.category}</span>
            {tool.requires_auth && <span>Auth required</span>}
          </div>
        </div>
      )}
    </div>
  );
}

interface ToolBrowserProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function ToolBrowser({ isOpen, onToggle }: ToolBrowserProps) {
  return (
    <div className="border-t border-card-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-400 hover:text-gray-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5" />
          Available Tools ({mockTools.length})
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2 max-h-64 overflow-y-auto">
          {mockTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
