import { create } from 'zustand';
import type { AuthenticatedUser } from '@/types/auth';
import { fetchCurrentUser, logout as logoutRequest } from '@/services/authService';
import { setAccessToken } from '@/services/apiClient';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  /** Sets the authenticated user after a successful login/register call. */
  setUser: (user: AuthenticatedUser) => void;
  /** Attempts silent session restore on app load (refresh cookie -> /me). */
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  setUser: (user) => set({ user, status: 'authenticated' }),

  hydrate: async () => {
    set({ status: 'loading' });
    try {
      const user = await fetchCurrentUser();
      set({ user, status: 'authenticated' });
    } catch {
      setAccessToken(null);
      set({ user: null, status: 'unauthenticated' });
    }
  },

  logout: async () => {
    try {
      await logoutRequest();
    } finally {
      set({ user: null, status: 'unauthenticated' });
    }
  },
}));
