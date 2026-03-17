import { useState, useEffect } from 'react';
import type { ModelInfo, ModelRecommendation } from '../types';
import { getModels, getRecommendation } from '../api/models';
import { mockModels, mockRecommendModel } from '../mocks/models';

interface ModelSelectorProps {
  selectedModelId: string | null;
  onModelSelect: (modelId: string) => void;
  definitionMd?: string | null;
  compact?: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  google: 'Google',
};

const COST_TIERS: Record<string, { label: string; color: string }> = {
  simple: { label: '$', color: 'text-green-400' },
  moderate: { label: '$$', color: 'text-amber-400' },
  complex: { label: '$$$', color: 'text-red-400' },
};

export default function ModelSelector({
  selectedModelId,
  onModelSelect,
  definitionMd,
  compact = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>(mockModels);
  const [recommendation, setRecommendation] = useState<ModelRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  // Load models from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getModels();
        if (!cancelled) setModels(data);
      } catch {
        // Use mock data
        if (!cancelled) setModels(mockModels);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Get recommendation when definition changes
  useEffect(() => {
    if (!definitionMd || definitionMd.trim().length < 50) {
      setRecommendation(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const rec = await getRecommendation(definitionMd);
        if (!cancelled) setRecommendation(rec);
      } catch {
        // Use mock recommendation
        if (!cancelled) setRecommendation(mockRecommendModel(definitionMd));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 500); // Debounce

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [definitionMd]);

  // Auto-select recommended model if nothing selected
  useEffect(() => {
    if (recommendation && !selectedModelId) {
      onModelSelect(recommendation.recommended_model_id);
    }
  }, [recommendation, selectedModelId, onModelSelect]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-400 whitespace-nowrap">Model:</label>
        <select
          value={selectedModelId || ''}
          onChange={(e) => onModelSelect(e.target.value)}
          className="bg-zinc-800 text-zinc-200 text-sm rounded-md border border-zinc-700 px-2 py-1 focus:border-amber-500 focus:outline-none"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
              {recommendation?.recommended_model_id === m.id ? ' ★' : ''}
            </option>
          ))}
        </select>
        {loading && (
          <span className="text-xs text-zinc-500 animate-pulse">analyzing...</span>
        )}
        {recommendation && !loading && (
          <span className="text-xs text-zinc-500" title={recommendation.reason}>
            {recommendation.complexity} complexity
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">Execution Model</h3>
        {loading && (
          <span className="text-xs text-zinc-500 animate-pulse">
            Analyzing complexity...
          </span>
        )}
      </div>

      {recommendation && !loading && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <p className="text-xs text-amber-400">{recommendation.reason}</p>
        </div>
      )}

      <div className="grid gap-2">
        {models.map((model) => {
          const isSelected = selectedModelId === model.id;
          const isRecommended = recommendation?.recommended_model_id === model.id;
          const costTier = COST_TIERS[model.complexity_tier] || COST_TIERS.moderate;

          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onModelSelect(model.id)}
              className={`relative flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
              }`}
            >
              {/* Provider icon */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                model.provider === 'anthropic'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {model.provider === 'anthropic' ? 'A' : 'G'}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isSelected ? 'text-amber-400' : 'text-zinc-200'}`}>
                    {model.display_name}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {PROVIDER_LABELS[model.provider]}
                  </span>
                  {isRecommended && (
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                      RECOMMENDED
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 truncate">
                  {model.recommended_for}
                </p>
              </div>

              {/* Cost */}
              <div className="shrink-0 text-right">
                <span className={`text-sm font-bold ${costTier.color}`}>
                  {costTier.label}
                </span>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -right-px -top-px h-3 w-3 rounded-bl-md rounded-tr-lg bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
