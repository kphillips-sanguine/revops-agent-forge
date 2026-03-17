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
      set({ user: null, isAuthenticated: false });
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
      localStorage.removeItem('auth_token');
      set({ user: null, isAuthenticated: false });
    }
  },
}));
