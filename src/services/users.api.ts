import { apiClient } from '@/lib/api/client';
import type {
  PrivacySettings,
  UserProfile,
  UserSearchPage,
} from '@/features/friends/types';

export const usersApi = {
  // Hồ sơ user khác (viewer-scoped: kèm isMe, friendship). 404 USER_NOT_FOUND nếu
  // không tồn tại HOẶC user đó đang chặn mình. Xem 24-profile.md §3.
  getProfile: (id: string) => apiClient.get<UserProfile>(`/api/v1/users/${id}`),

  // Cài đặt chia sẻ thông tin cá nhân của chính chủ (xem 30-profile-visibility.md §4).
  getPrivacy: () => apiClient.get<PrivacySettings>('/api/v1/users/me/privacy'),

  updatePrivacy: (patch: Partial<PrivacySettings>) =>
    apiClient.patch<PrivacySettings>('/api/v1/users/me/privacy', {
      body: patch,
    }),

  // q bắt đầu bằng '@' → BE tìm CHÍNH XÁC theo username (≥2 ký tự). Bình thường → prefix.
  search: async (params: {
    q: string;
    limit?: number;
    cursor?: string | null;
  }): Promise<UserSearchPage> => {
    return apiClient.get<UserSearchPage>('/api/v1/users/search', {
      query: {
        q: params.q,
        limit: params.limit ?? 20,
        cursor: params.cursor ?? undefined,
      },
    });
  },
} as const;
