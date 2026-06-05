'use client';

import { create } from 'zustand';
import { apiAuth } from '@/lib/api/client';
import type { AuthTokens, AuthUser } from '@/features/auth/types';

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setSession: (user: AuthUser, tokens: AuthTokens) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  hydrated: false,
  setSession: (user, tokens) => {
    apiAuth.setToken(tokens.accessToken, tokens.expiresIn);
    set({ user, isAuthenticated: true });
  },
  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  clear: () => {
    apiAuth.setToken(null);
    set({ user: null, isAuthenticated: false });
  },
  setHydrated: (v) => set({ hydrated: v }),
}));
