import { create } from 'zustand';
import type { AuthenticatedUser } from '@/types/auth';
import { fetchCurrentUser, logout as logoutRequest } from '@/services/authService';
import { setAccessToken, getAccessToken } from '@/services/apiClient';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  /** Sets the authenticated user after a successful login/register call. */
  setUser: (user: AuthenticatedUser) => void;
  /** Attempts silent session restore on app load (sessionStorage token → /me). */
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  setUser: (user) => set({ user, status: 'authenticated' }),

  hydrate: async () => {
    // If there is no token at all (neither in-memory nor sessionStorage),
    // skip the /me call immediately — it would 401 anyway.
    const token = getAccessToken();
    if (!token) {
      set({ user: null, status: 'unauthenticated' });
      return;
    }

    set({ status: 'loading' });
    try {
      const user = await fetchCurrentUser();
      set({ user, status: 'authenticated' });
    } catch {
      // Token expired or invalid — clear it.
      setAccessToken(null);
      set({ user: null, status: 'unauthenticated' });
    }
  },

  logout: async () => {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      set({ user: null, status: 'unauthenticated' });
    }
  },
}));
