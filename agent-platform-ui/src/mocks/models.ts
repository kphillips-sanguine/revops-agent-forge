import type { ModelInfo, ModelRecommendation } from '../types';

export const mockModels: ModelInfo[] = [
  {
    id: 'claude-sonnet',
    display_name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model_id: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    cost_per_1k_input: 0.003,
    cost_per_1k_output: 0.015,
    supports_tools: true,
    recommended_for: 'Complex multi-step agents with tool use, nuanced reasoning',
    complexity_tier: 'complex',
  },
  {
    id: 'gemini-pro',
    display_name: 'Gemini 2.5 Pro',
    provider: 'google',
    model_id: 'gemini-2.5-pro-preview-06-05',
    max_tokens: 8192,
    cost_per_1k_input: 0.00125,
    cost_per_1k_output: 0.01,
    supports_tools: true,
    recommended_for: 'Complex reasoning tasks, long context, cost-effective alternative to Sonnet',
    complexity_tier: 'complex',
  },
  {
    id: 'gemini-flash',
    display_name: 'Gemini 2.5 Flash',
    provider: 'google',
    model_id: 'gemini-2.5-flash-preview-05-20',
    max_tokens: 8192,
    cost_per_1k_input: 0.00015,
    cost_per_1k_output: 0.0006,
    supports_tools: true,
    recommended_for: 'Simple agents, high-volume tasks, fast execution, lowest cost',
    complexity_tier: 'simple',
  },
];

export function mockRecommendModel(definitionMd: string): ModelRecommendation {
  const lower = definitionMd.toLowerCase();
  const toolCount = (definitionMd.match(/- \*\*\w+\*\*:/g) || []).length;
  const stepCount = (definitionMd.match(/^\d+\./gm) || []).length;
  const hasDecisionLogic = lower.includes('### decision logic');
  const hasSensitiveTools = lower.includes('sensitive') || lower.includes('sf_record_update');

  let score = 0;
  const reasons: string[] = [];

  if (toolCount >= 4) { score += 3; reasons.push(`${toolCount} tools`); }
  else if (toolCount >= 2) { score += 1; }

  if (stepCount >= 6) { score += 3; reasons.push(`${stepCount} steps`); }
  else if (stepCount >= 3) { score += 1; }

  if (hasDecisionLogic) { score += 2; reasons.push('Decision logic'); }
  if (hasSensitiveTools) { score += 2; reasons.push('Write/sensitive tools'); }
  if (definitionMd.length > 2000) { score += 1; }
  if (definitionMd.length > 4000) { score += 1; }

  if (score >= 5) {
    return {
      recommended_model_id: 'claude-sonnet',
      complexity: 'complex',
      complexity_score: score,
      reason: `Complex agent — Claude Sonnet recommended.${reasons.length ? ` (${reasons.join(', ')})` : ''}`,
    };
  } else if (score >= 2) {
    return {
      recommended_model_id: 'gemini-pro',
      complexity: 'moderate',
      complexity_score: score,
      reason: `Moderate complexity — Gemini Pro recommended.${reasons.length ? ` (${reasons.join(', ')})` : ''}`,
    };
  }
  return {
    recommended_model_id: 'gemini-flash',
    complexity: 'simple',
    complexity_score: score,
    reason: 'Simple agent — Gemini Flash recommended for speed and cost.',
  };
}
