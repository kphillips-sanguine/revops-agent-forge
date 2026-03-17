import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary">
      <div className="text-center max-w-md px-6">
        <div className="text-7xl font-bold text-amber-accent/20 mb-4">404</div>
        <h1 className="text-xl font-semibold text-gray-200 mb-2">
          Page not found
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 rounded-lg border border-card-border transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-amber-accent hover:bg-amber-accent-hover text-gray-950 font-medium rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
