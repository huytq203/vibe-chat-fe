'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/auth.api';
import { authKeys } from '@/services/keys';
import { notificationsApi } from '@/services/notifications.api';
import { closeSocket } from '@/lib/ws/socket';
import { getFcmToken } from '@/lib/firebase/messaging';
import { useAuthStore } from '../stores/auth.store';
import type { LoginInput, RegisterInput, UpdateMeInput } from '../schemas';

export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data) => {
      queryClient.clear();
      setSession(data.user, data.tokens.accessToken);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (data) => {
      queryClient.clear();
      setSession(data.user, data.tokens.accessToken);
    },
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (input: UpdateMeInput) => authApi.updateMe(input),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me(), data);
      setUser(data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: async () => {
      // Xoá FCM token TRƯỚC khi logout — cần access token còn hiệu lực.
      const token = await getFcmToken().catch(() => null);
      if (token) {
        await notificationsApi.deleteFcmToken(token).catch(() => undefined);
      }
      await authApi.logout().catch(() => undefined);
    },
    onSettled: () => {
      closeSocket();
      clear();
      queryClient.clear();
    },
  });
}
