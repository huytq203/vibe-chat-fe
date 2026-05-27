import { apiClient } from '@/lib/api/client';
import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  LoginInput,
  RegisterInput,
  UpdateMeInput,
} from '@/features/auth';

/**
 * Auth REST endpoints. Pure transport — không đụng cache/state.
 * Hook (TanStack Query) ở features/auth/hooks/*.
 */
export const authApi = {
  login: (input: LoginInput) =>
    apiClient.post<AuthSession>('/api/v1/auth/login', {
      auth: false,
      body: { username: input.username, password: input.password },
    }),
  register: (input: RegisterInput) =>
    apiClient.post<AuthSession>('/api/v1/auth/register', {
      auth: false,
      body: input,
    }),
  logout: () => apiClient.post<void>('/api/v1/auth/logout'),
  refreshAccessToken: () =>
    apiClient.post<AuthTokens>('/api/v1/auth/refresh', {
      auth: false,
    }),     
  fetchMe: () => apiClient.get<AuthUser>('/api/v1/auth/me'),
  updateMe: (input: UpdateMeInput) =>
    apiClient.patch<AuthUser>('/api/v1/users/me', { body: input }),
} as const;
