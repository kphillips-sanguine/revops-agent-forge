import { Bot } from 'lucide-react';

export default function AgentsPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-6 h-6 text-amber-accent" />
        <h1 className="text-2xl font-semibold text-gray-100">Agents</h1>
      </div>
      <div className="bg-card-bg border border-card-border rounded-lg p-8 text-center">
        <p className="text-gray-500">Coming soon — agent list with filters, search, and status management.</p>
      </div>
    </div>
  );
}
