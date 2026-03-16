import { useParams } from 'react-router-dom';
import { Bot } from 'lucide-react';

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-6 h-6 text-amber-accent" />
        <h1 className="text-2xl font-semibold text-gray-100">Agent Detail</h1>
        <span className="text-sm text-gray-500 font-mono">{id}</span>
      </div>
      <div className="bg-card-bg border border-card-border rounded-lg p-8 text-center">
        <p className="text-gray-500">Coming soon — agent definition editor, execution history, and lifecycle management.</p>
      </div>
    </div>
  );
}
