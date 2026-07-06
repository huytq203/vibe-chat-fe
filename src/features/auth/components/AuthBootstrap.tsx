'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiAuth, ApiError } from '@/lib/api/client';
import { authApi } from '@/services/auth.api';
import { authKeys, chatKeys, notificationKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { ensureSessionKey, clearSessionKey, getSessionKey } from '@/lib/crypto/session-key';

type Props = {
  requireAuth?: boolean;
  redirectTo?: string;
  // Trang auth (login/register): đã có phiên hợp lệ → chuyển thẳng vào app,
  // không bắt user nhìn form đăng nhập dù session 90 ngày vẫn còn sống.
  redirectIfAuthed?: string;
};

export function AuthBootstrap({
  requireAuth = false,
  redirectTo = '/login',
  redirectIfAuthed,
}: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;

    apiAuth.onUnauthorized(() => {
      clearSessionKey();
      // Chỉ clear user khi store còn đang authed — tránh đè lên login đang chạy song song.
      if (useAuthStore.getState().isAuthenticated) setUser(null);
      if (requireAuth) router.replace(redirectTo);
    });

    // Nếu đã có session (vd login form vừa setSession trước khi bootstrap mount) → bỏ qua bootstrap.
    if (useAuthStore.getState().isAuthenticated) {
      const token = apiAuth.getToken();
      // PHẢI lập session key XONG trước khi hydrate: ChatLayout render song song sẽ bắn
      // query ngay, chưa có key → BE trả 401 SESSION_KEY_MISSING. Client layer cũng tự
      // ensure ở request đầu (dedupe chung), đây là để chủ động warm sớm.
      void (async () => {
        try {
          if (token && !getSessionKey()) await ensureSessionKey(token);
        } catch {
          // best-effort: ensureSessionKey ở client sẽ thử lại ở request đầu tiên
        } finally {
          if (!cancelled) setHydrated(true);
        }
      })();
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
          await ensureSessionKey(tokens.accessToken);
        }
        const { me, conversations, unreadCount, systemNotifCount } = await authApi.bootstrap();
        if (cancelled || useAuthStore.getState().isAuthenticated) return;
        // Seed toàn bộ data khởi động vào cache trước khi render ChatLayout →
        // tất cả useQuery (me, conversations, unreadCount) đều hit cache, không call REST thêm.
        qc.setQueryData(authKeys.me(), me);
        qc.setQueryData(chatKeys.conversationList({ page: 1, limit: 30 }), conversations);
        qc.setQueryData(notificationKeys.unreadCount(), { unreadCount });
        qc.setQueryData(notificationKeys.unreadCount('system'), { unreadCount: systemNotifCount });
        setUser(me);
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
      clearSessionKey();
    };
  }, [hydrated, requireAuth, redirectTo, router, qc, setUser, setHydrated]);

  // Redirect khi mất session sau khi đã hydrate (vd logout từ trang protected).
  useEffect(() => {
    if (!hydrated) return;
    if (requireAuth && !isAuthed) router.replace(redirectTo);
    if (redirectIfAuthed && isAuthed) router.replace(redirectIfAuthed);
  }, [hydrated, isAuthed, requireAuth, redirectTo, redirectIfAuthed, router]);

  return null;
}
