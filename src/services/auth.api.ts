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
  logout: () => apiClient.post<void>('/api/v1/auth/logout'),
  refreshAccessToken: () =>
    apiClient.post<AuthTokens>('/api/v1/auth/refresh', {
      auth: false,
    }),     
  // Hồ sơ thuộc CHAT backend (không phải identity): path /users/* → tự route sang VIBE_URL.
  fetchMe: () => apiClient.get<AuthUser>('/api/v1/users/me'),
  // PATCH partial — chỉ field gửi lên mới đổi. avatar/cover gửi mediaId (xem 24-profile.md).
  updateMe: (input: UpdateMeInput) =>
    apiClient.patch<AuthUser>('/api/v1/users/me', { body: input }),
} as const;
