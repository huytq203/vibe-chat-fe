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
  const isAuthed = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;

    apiAuth.onUnauthorized(() => {
      // Chỉ clear user khi store còn đang authed — tránh đè lên login đang chạy song song.
      if (useAuthStore.getState().isAuthenticated) setUser(null);
      if (requireAuth) router.replace(redirectTo);
    });

    // Nếu đã có session (vd login form vừa setSession trước khi bootstrap mount) → bỏ qua bootstrap.
    if (useAuthStore.getState().isAuthenticated) {
      setHydrated(true);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        if (!apiAuth.getToken()) {
          const tokens = await authApi.refreshAccessToken();
          if (cancelled || useAuthStore.getState().isAuthenticated) return;
          apiAuth.setToken(tokens.accessToken, tokens.expiresIn);
        }
        const user = await authApi.fetchMe();
        if (cancelled || useAuthStore.getState().isAuthenticated) return;
        setUser(user);
      } catch (e) {
        if (cancelled) return;
        // Có thể trong lúc await user đã login bằng form khác → không đè.
        if (useAuthStore.getState().isAuthenticated) return;
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

  // Redirect khi mất session sau khi đã hydrate (vd logout từ trang protected).
  useEffect(() => {
    if (!hydrated) return;
    if (requireAuth && !isAuthed) router.replace(redirectTo);
  }, [hydrated, isAuthed, requireAuth, redirectTo, router]);

  return null;
}
