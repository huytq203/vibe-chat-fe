'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/auth.api';
import { closeSocket } from '@/lib/ws/socket';
import { useAuthStore } from '../stores/auth.store';
import type { LoginInput, RegisterInput } from '../schemas';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data) => {
      setSession(data.user, data.tokens.accessToken);
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (data) => {
      setSession(data.user, data.tokens.accessToken);
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: async () => {
      await authApi.logout().catch(() => undefined);
    },
    onSettled: () => {
      closeSocket();
      clear();
    },
  });
}
