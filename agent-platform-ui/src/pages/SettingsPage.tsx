import { useEffect } from 'react';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  useEffect(() => {
    document.title = 'Settings | AgentForge';
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-amber-accent" />
        <h1 className="text-2xl font-semibold text-gray-100">Settings</h1>
      </div>
      <div className="bg-card-bg border border-card-border rounded-lg p-8 text-center">
        <p className="text-gray-500">Coming soon — platform settings, API keys, and user preferences.</p>
      </div>
    </div>
  );
}
