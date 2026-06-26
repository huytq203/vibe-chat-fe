'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/auth.api';
import { authKeys, chatKeys } from '@/services/keys';
import { notificationsApi } from '@/services/notifications.api';
import { closeSocket } from '@/lib/ws/socket';
import { getFcmToken } from '@/lib/firebase/messaging';
import { getDeviceName, getDeviceType } from '@/lib/device/device-info';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useConvLockStore } from '@/features/chat/stores/conv-lock.store';
import type {
  LoginInput,
  RegisterInput,
  UpdateMeInput,
  VerifyEmailInput,
} from '@/features/auth/schemas';

export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) =>
      authApi.login({ ...input, deviceType: getDeviceType(), deviceName: getDeviceName() }),
    onSuccess: (data) => {
      queryClient.clear();
      setSession(data.user, data.tokens);
      // User trong response login (auth-service) thiếu avatarUrl presigned —
      // đồng bộ lại profile đầy đủ từ /users/me (chat-service). Best-effort.
      void authApi
        .fetchMe()
        .then((user) => {
          queryClient.setQueryData(authKeys.me(), user);
          useAuthStore.getState().setUser(user);
        })
        .catch(() => undefined);
    },
  });
}

// Đăng ký KHÔNG đăng nhập luôn — trả { message, email } để chuyển sang màn nhập OTP.
export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (input: VerifyEmailInput) => authApi.verifyEmail(input),
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (email: string) => authApi.resendOtp(email),
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
      // Avatar/tên trong conversation list lấy từ conversation.members đã cache →
      // invalidate để list refetch avatar mới, không phải F5.
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// ── Quên mật khẩu ──────────────────────────────────────────────────────────
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { email: string; otp: string; newPassword: string }) =>
      authApi.resetPassword(input),
  });
}

// ── Khôi phục tài khoản (sau khi login bị chặn vì đã xoá) ────────────────────
export function useRequestRestore() {
  return useMutation({
    mutationFn: (restoreToken: string) => authApi.requestRestore(restoreToken),
  });
}

export function useConfirmRestore() {
  return useMutation({
    mutationFn: (input: { restoreToken: string; otp: string }) =>
      authApi.confirmRestore(input),
  });
}

// ── Xoá tài khoản (xoá mềm) ──────────────────────────────────────────────────
// BE đã đá mọi phiên → sau khi xoá, dọn session phía client như logout.
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  const clearLockSession = useConvLockStore((s) => s.clearAll);
  return useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSettled: () => {
      closeSocket();
      clearLockSession();
      clear();
      queryClient.clear();
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  const clearLockSession = useConvLockStore((s) => s.clearAll);
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
      clearLockSession();
      clear();
      queryClient.clear();
    },
  });
}
