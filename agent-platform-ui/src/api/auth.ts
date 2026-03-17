import apiClient from './client';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
  };
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/api/auth/login', {
    email,
    password,
  });
  return response.data;
}

export async function getMe(): Promise<LoginResponse['user']> {
  const response = await apiClient.get<LoginResponse['user']>('/api/auth/me');
  return response.data;
}
