'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiAuth, ApiError } from '@/lib/api/client';
import { authApi } from '@/services/auth.api';
import { useAuthStore } from '../stores/auth.store';

type Props = { requireAuth?: boolean; redirectTo?: string };

export function AuthBootstrap({ requireAuth = false, redirectTo = '/login' }: Props) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    apiAuth.onUnauthorized(() => {
      setUser(null);
      if (requireAuth) router.replace(redirectTo);
    });

    (async () => {
      try {
        if (!apiAuth.getToken()) {
          const tokens = await authApi.refreshAccessToken();
          apiAuth.setToken(tokens.accessToken);
        }
        const user = await authApi.fetchMe();
        if (!cancelled) setUser(user);
      } catch (e) {
        if (cancelled) return;
        setUser(null);
        if (requireAuth) router.replace(redirectTo);
        if (e instanceof ApiError && e.status !== 401) {
          // swallow — bootstrap is best-effort
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, requireAuth, redirectTo, router, setUser, setHydrated]);

  return null;
}
