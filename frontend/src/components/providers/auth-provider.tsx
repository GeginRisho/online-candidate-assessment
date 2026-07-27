'use client';

import * as React from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * On first mount, attempts a silent session restore: the API client's 401
 * interceptor will transparently use the httpOnly refresh cookie to obtain
 * a fresh access token if a valid session exists. This is what lets a
 * signed-in candidate or admin refresh the page without being bounced to
 * a login screen.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const status = useAuthStore((state) => state.status);

  React.useEffect(() => {
    if (status === 'idle') {
      void hydrate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

/**
 * Convenience hook mirroring a traditional "useAuth" context API, backed by
 * the Zustand store so components can subscribe to only the slices they need.
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const setUser = useAuthStore((state) => state.setUser);

  return {
    user,
    isLoading: status === 'idle' || status === 'loading',
    isAuthenticated: status === 'authenticated',
    logout,
    setUser,
  };
}
