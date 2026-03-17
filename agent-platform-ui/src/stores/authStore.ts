import { create } from 'zustand';
import { login as apiLogin, getMe } from '../api/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

function getStoredToken(): string | null {
  return localStorage.getItem('auth_token');
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!getStoredToken(),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLogin(email, password);
      localStorage.setItem('auth_token', response.access_token);
      set({
        user: {
          id: response.user.id,
          email: response.user.email,
          name: response.user.display_name,
          role: response.user.role,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let detail = 'Login failed';
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err
      ) {
        const resp = (err as { response?: { data?: { detail?: string } } })
          .response;
        if (resp?.data?.detail) {
          detail = resp.data.detail;
        }
      }
      set({ isLoading: false, error: detail });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      // No token — check if backend is available, if not use dev mode
      try {
        const response = await fetch('http://localhost:8000/api/health');
        if (!response.ok) throw new Error('Backend unavailable');
        // Backend is up but no token — need to login
        set({ user: null, isAuthenticated: false });
      } catch {
        // Backend not running — use dev mode with mock user
        console.info('[AgentForge] Backend unavailable — using dev mode with mock data');
        set({
          user: {
            id: 'dev-user',
            email: 'kevin@sanguinebio.com',
            name: 'Kevin Phillips',
            role: 'revops',
          },
          isAuthenticated: true,
        });
      }
      return;
    }

    try {
      const userData = await getMe();
      set({
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.display_name,
          role: userData.role,
        },
        isAuthenticated: true,
      });
    } catch {
      // API failed — try dev mode fallback
      try {
        await fetch('http://localhost:8000/api/health');
        // Backend is up but token is bad — need to re-login
        localStorage.removeItem('auth_token');
        set({ user: null, isAuthenticated: false });
      } catch {
        // Backend not running — use dev mode
        console.info('[AgentForge] Backend unavailable — using dev mode with mock data');
        set({
          user: {
            id: 'dev-user',
            email: 'kevin@sanguinebio.com',
            name: 'Kevin Phillips',
            role: 'revops',
          },
          isAuthenticated: true,
        });
      }
    }
  },
}));
