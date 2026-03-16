import { useEffect } from 'react';
import { Wrench } from 'lucide-react';

export default function ToolsPage() {
  useEffect(() => {
    document.title = 'Tools | AgentForge';
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="w-6 h-6 text-amber-accent" />
        <h1 className="text-2xl font-semibold text-gray-100">Tools</h1>
      </div>
      <div className="bg-card-bg border border-card-border rounded-lg p-8 text-center">
        <p className="text-gray-500">Coming soon — tool registry with categories, tiers, and usage stats.</p>
      </div>
    </div>
  );
}
