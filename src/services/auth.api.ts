import { apiClient } from '@/lib/api/client';
import type { DeviceType } from '@/lib/device/device-info';
import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  LoginInput,
  RegisterInput,
  RegisterResult,
  UpdateMeInput,
  VerifyEmailInput,
} from '@/features/auth';
import type { Conversation } from '@/features/chat/types';

export type BootstrapResponse = {
  me: AuthUser;
  conversations: Conversation[];
  conversationsMeta: { page: number; limit: number; total: number };
  unreadCount: number;
  systemNotifCount: number;
};

/**
 * Auth REST endpoints. Pure transport — không đụng cache/state.
 * Hook (TanStack Query) ở features/auth/hooks/*.
 */
export const authApi = {
  login: (input: LoginInput & { deviceType: DeviceType; deviceName?: string }) =>
    apiClient.post<AuthSession>('/api/v1/auth/login', {
      auth: false,
      body: {
        username: input.username,
        password: input.password,
        deviceType: input.deviceType,
        ...(input.deviceName ? { deviceName: input.deviceName } : {}),
      },
    }),
  // Đăng ký KHÔNG trả token — tài khoản INACTIVE, BE gửi OTP qua email. Xem docs/fe-auth-otp-guide.md.
  register: (input: RegisterInput) =>
    apiClient.post<RegisterResult>('/api/v1/auth/register', {
      auth: false,
      body: input,
    }),
  verifyEmail: (input: VerifyEmailInput) =>
    apiClient.post<{ message: string }>('/api/v1/auth/verify-email', {
      auth: false,
      body: input,
    }),
  resendOtp: (email: string) =>
    apiClient.post<{ message: string }>('/api/v1/auth/resend-otp', {
      auth: false,
      body: { email },
    }),
  // ── Quên mật khẩu ──────────────────────────────────────────────────────
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/api/v1/auth/forgot-password', {
      auth: false,
      body: { email },
    }),
  resetPassword: (input: { email: string; otp: string; newPassword: string }) =>
    apiClient.post<{ message: string }>('/api/v1/auth/reset-password', {
      auth: false,
      body: input,
    }),

  // ── Xoá / khôi phục tài khoản ──────────────────────────────────────────
  // Xoá mềm tài khoản hiện tại (cần đăng nhập). BE đá mọi phiên + lên lịch purge 7 ngày.
  deleteAccount: () =>
    apiClient.delete<{ message: string }>('/api/v1/auth/account'),
  // Gửi OTP khôi phục — dùng restoreToken nhận được khi login bị chặn (AUTH_ACCOUNT_DELETED).
  requestRestore: (restoreToken: string) =>
    apiClient.post<{ message: string; email: string | null }>(
      '/api/v1/auth/account/restore/request',
      { auth: false, body: { restoreToken } },
    ),
  confirmRestore: (input: { restoreToken: string; otp: string }) =>
    apiClient.post<{ message: string }>('/api/v1/auth/account/restore/confirm', {
      auth: false,
      body: input,
    }),

  logout: () => apiClient.post<void>('/api/v1/auth/logout'),
  refreshAccessToken: () =>
    apiClient.post<AuthTokens>('/api/v1/auth/refresh', {
      auth: false,
    }),     
  // Hồ sơ thuộc CHAT backend (không phải identity): path /users/* → tự route sang VIBE_URL.
  fetchMe: () => apiClient.get<AuthUser>('/api/v1/users/me'),
  // Gộp me + conversations trang 1 + unread counts → 1 request khi khởi động.
  bootstrap: () => apiClient.get<BootstrapResponse>('/api/v1/bootstrap'),
  // PATCH partial — chỉ field gửi lên mới đổi. avatar/cover gửi mediaId (xem 24-profile.md).
  updateMe: (input: UpdateMeInput) =>
    apiClient.patch<AuthUser>('/api/v1/users/me', { body: input }),
} as const;
