'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type SignupRequest } from '@/services/auth.api';
import { authKeys } from '@/services/keys';
import { getDeviceName } from '@/lib/device/device-info';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { buildDeviceContext } from '@/features/auth/lib/device-context';
import type { HandoffParams, LoginOutcome } from '@/features/auth/types';

type WithHandoff<T> = T & { handoff: HandoffParams | null };

/** AUTHENTICATED → lưu phiên + đồng bộ hồ sơ đầy đủ từ chat-service (best-effort). */
function useApplyOutcome(): (outcome: LoginOutcome) => void {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  return useCallback(
    (outcome: LoginOutcome) => {
      if (outcome.status !== 'AUTHENTICATED') return;
      queryClient.clear();
      setSession(outcome.user, outcome.tokens);
      void authApi
        .fetchMe()
        .then((user) => {
          queryClient.setQueryData(authKeys.me(), user);
          useAuthStore.getState().setUser(user);
        })
        .catch(() => undefined);
    },
    [queryClient, setSession],
  );
}

export function useRequestLoginCode() {
  return useMutation({ mutationFn: (email: string) => authApi.requestLoginCode(email) });
}

export function useVerifyLoginCode() {
  const apply = useApplyOutcome();
  return useMutation({
    mutationFn: ({ handoff, ...input }: WithHandoff<{ email: string; code: string }>) =>
      authApi.verifyLoginCode({ ...input, ...buildDeviceContext(handoff) }),
    onSuccess: apply,
  });
}

export function useGoogleLogin() {
  const apply = useApplyOutcome();
  return useMutation({
    mutationFn: ({ handoff, ...input }: WithHandoff<{ idToken: string }>) =>
      authApi.loginWithGoogle({ ...input, ...buildDeviceContext(handoff) }),
    onSuccess: apply,
  });
}

export function useCompleteSignup() {
  const apply = useApplyOutcome();
  return useMutation({
    mutationFn: ({ handoff, ...input }: WithHandoff<SignupRequest>) =>
      authApi.completeSignup({ ...input, ...buildDeviceContext(handoff) }),
    onSuccess: apply,
  });
}

/** App desktop đổi mã chuyển giao lấy token — phiên DESKTOP mang tên máy này. */
export function useExchangeHandoff() {
  const apply = useApplyOutcome();
  return useMutation({
    mutationFn: (input: { code: string; codeVerifier: string }) =>
      authApi.exchangeHandoff({ ...input, deviceName: getDeviceName() }),
    onSuccess: apply,
  });
}
