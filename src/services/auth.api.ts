import { apiClient } from '@/lib/api/client';
import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  LoginIdentity,
  LoginOutcome,
  UpdateMeInput,
} from '@/features/auth';
import type { DeviceContext } from '@/features/auth/lib/device-context';
import type { Conversation } from '@/features/chat/types';

export type BootstrapResponse = {
  me: AuthUser;
  conversations: Conversation[];
  conversationsMeta: {
    page: number;
    limit: number;
    total: number;
    archived?: { total: number; unread: number };
  };
  unreadCount: number;
  systemNotifCount: number;
};

/**
 * Auth REST endpoints. Pure transport — không đụng cache/state.
 * Hook (TanStack Query) ở features/auth/hooks/*.
 */
export type SignupRequest = {
  signupTicket: string;
  username: string;
  displayName: string;
  dateOfBirth: string;
  phone?: string;
};

export const authApi = {
  // ── Đăng nhập không mật khẩu ───────────────────────────────────────────
  // BE luôn trả 202 cho mọi email (không lộ email nào đã đăng ký).
  requestLoginCode: (email: string) =>
    apiClient.post<{ message: string }>('/api/v1/auth/email/request-code', {
      auth: false,
      body: { email },
    }),
  verifyLoginCode: (input: { email: string; code: string } & DeviceContext) =>
    apiClient.post<LoginOutcome>('/api/v1/auth/email/verify', { auth: false, body: input }),
  loginWithGoogle: (input: { idToken: string } & DeviceContext) =>
    apiClient.post<LoginOutcome>('/api/v1/auth/google', { auth: false, body: input }),
  completeSignup: (input: SignupRequest & DeviceContext) =>
    apiClient.post<LoginOutcome>('/api/v1/auth/signup', { auth: false, body: input }),
  exchangeHandoff: (input: { code: string; codeVerifier: string; deviceName?: string }) =>
    apiClient.post<LoginOutcome>('/api/v1/auth/handoff/exchange', { auth: false, body: input }),
  checkUsername: (username: string) =>
    apiClient.get<{ available: boolean }>(
      `/api/v1/auth/username-available?username=${encodeURIComponent(username)}`,
      { auth: false },
    ),
  listIdentities: () => apiClient.get<LoginIdentity[]>('/api/v1/auth/identities'),

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
