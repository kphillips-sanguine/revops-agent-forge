import { Plus } from 'lucide-react';

export default function BuilderPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Plus className="w-6 h-6 text-amber-accent" />
        <h1 className="text-2xl font-semibold text-gray-100">Builder</h1>
      </div>
      <div className="bg-card-bg border border-card-border rounded-lg p-8 text-center">
        <p className="text-gray-500">Coming soon — AI-powered agent builder with chat and Monaco editor.</p>
      </div>
    </div>
  );
}
