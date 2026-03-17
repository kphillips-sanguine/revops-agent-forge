import apiClient from './client';
import type { ModelInfo, ModelRecommendation } from '../types';

export async function getModels(): Promise<ModelInfo[]> {
  const response = await apiClient.get<ModelInfo[]>('/api/models/');
  return response.data;
}

export async function getRecommendation(definition_md: string): Promise<ModelRecommendation> {
  const response = await apiClient.post<ModelRecommendation>('/api/models/recommend', {
    definition_md,
  });
  return response.data;
}
