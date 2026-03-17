export interface ModelInfo {
  id: string;
  display_name: string;
  provider: 'anthropic' | 'google';
  model_id: string;
  max_tokens: number;
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  supports_tools: boolean;
  recommended_for: string;
  complexity_tier: 'simple' | 'moderate' | 'complex';
}

export interface ModelRecommendation {
  recommended_model_id: string;
  complexity: 'simple' | 'moderate' | 'complex';
  complexity_score: number;
  reason: string;
}
