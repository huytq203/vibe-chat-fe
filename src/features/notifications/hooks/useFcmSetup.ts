'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getFcmToken,
  onForegroundMessage,
  requestPushPermission,
} from '@/lib/firebase/messaging';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/features/auth';
import { isFirebaseConfigured } from '@/config/env';
import { notificationKeys } from '@/services/keys';
import { useRegisterFcmToken } from './use-mutations';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Đăng ký FCM token sau khi user login + refresh định kỳ.
 * Idempotent ở BE — gọi lặp với cùng token không tạo bản ghi mới.
 */
export function useFcmSetup() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const registerMut = useRegisterFcmToken();
  const qc = useQueryClient();
  const lastUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthed || !userId) return;
    console.log('[FCM] useFcmSetup effect', {
      isAuthed,
      userId,
      configured: isFirebaseConfigured(),
    });
    if (!isFirebaseConfigured()) {
      logger.info('FCM skipped (firebase env not configured)');
      return;
    }
    // Tránh re-run khi mount lại cùng user.
    if (lastUserRef.current === userId) return;
    lastUserRef.current = userId;

    let cancelled = false;
    let unsubForeground: (() => void) | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function register() {
      console.log('[FCM] register: requesting permission');
      const perm = await requestPushPermission();
      console.log('[FCM] permission =', perm);
      if (perm !== 'granted') {
        logger.info('Push permission not granted', { perm });
        return;
      }
      console.log('[FCM] getting token...');
      const token = await getFcmToken();
      console.log('[FCM] token =', token ? token.slice(0, 24) + '...' : null);
      if (!token || cancelled) return;
      try {
        await registerMut.mutateAsync({
          token,
          deviceType: 'WEB',
          userAgent: navigator.userAgent,
        });
        console.log('[FCM] registered to BE OK');
        logger.info('FCM token registered');
      } catch (err) {
        console.error('[FCM] register BE failed', err);
        logger.warn('FCM register failed', { err: String(err) });
      }
    }

    void register();

    intervalId = setInterval(() => void register(), REFRESH_INTERVAL_MS);

    void onForegroundMessage((payload) => {
      // Khi WS event 'notification:new' đã cập nhật cache, FCM foreground
      // chỉ cần đảm bảo invalidate (đa số trường hợp WS đã làm trước).
      qc.invalidateQueries({ queryKey: notificationKeys.all });
      const title = payload.notification?.title ?? 'Vibe Chat';
      const body = payload.notification?.body;
      if (typeof document !== 'undefined' && document.hasFocus()) {
        toast(title, { description: body });
      }
    }).then((unsub) => {
      if (cancelled) unsub();
      else unsubForeground = unsub;
    });

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (unsubForeground) unsubForeground();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, userId]);
}
