import { Zap } from 'lucide-react';

export default function ExecutionsPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-6 h-6 text-amber-accent" />
        <h1 className="text-2xl font-semibold text-gray-100">Executions</h1>
      </div>
      <div className="bg-card-bg border border-card-border rounded-lg p-8 text-center">
        <p className="text-gray-500">Coming soon — execution history with filters, timelines, and detail views.</p>
      </div>
    </div>
  );
}
