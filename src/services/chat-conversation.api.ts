import { apiClient } from '@/lib/api/client';
import type {
  CommonGroupsPage,
  Conversation,
  GroupSettings,
  Presence,
} from '@/features/chat/types';

/** Body cập nhật tên/mô tả/avatar/công khai nhóm (PATCH /conversations/{id}). Xem 28. */
export type UpdateConversationInput = {
  name?: string;
  /** Gửi null để xoá mô tả. */
  description?: string | null;
  /** mediaId ảnh đã upload (xem 14-media-upload). Gửi null để gỡ avatar. */
  avatarMediaId?: string | null;
  isPublic?: boolean;
};

/** Transport cho hội thoại: tạo/liệt kê/xoá + ghim/mute/nền/cài đặt + presence. */
export const conversationApi = {
  listConversations: (params: { page: number; limit: number }) =>
    apiClient.get<Conversation[]>('/api/v1/conversations', { query: params }),

  getConversation: (id: string) =>
    apiClient.get<Conversation>(`/api/v1/conversations/${id}`),

  createDirect: (userId: string) =>
    apiClient.post<Conversation>('/api/v1/conversations/direct', {
      body: { userId, encryptionType: 'NONE' },
    }),

  // scope: "ME" (default, ẩn phía mình) | "BOTH" (ẩn cả 2) — chỉ áp dụng DIRECT.
  // GROUP/CHANNEL: scope bị BE bỏ qua, luôn xoá toàn cục. Xem 03-conversations.md.
  deleteConversation: (id: string, scope?: 'ME' | 'BOTH') =>
    apiClient.delete<{ ok: true }>(`/api/v1/conversations/${id}`, {
      body: scope ? { scope } : undefined,
    }),

  getPresenceBulk: (userIds: string[]) =>
    apiClient.get<Presence[]>('/api/v1/presence', {
      query: { userIds: userIds.join(',') },
    }),

  createGroup: (input: { name: string; memberIds: string[] }) =>
    apiClient.post<Conversation>('/api/v1/conversations/group', {
      body: { ...input, encryptionType: 'NONE' },
    }),

  // ─── Ghim hội thoại ─────────────────────────────────────────────────────
  // PATCH /pin với body { pinned } — trả Conversation đã cập nhật isPinned. Xem 03.
  setPin: (id: string, pinned: boolean) =>
    apiClient.patch<Conversation>(`/api/v1/conversations/${id}/pin`, {
      body: { pinned },
    }),

  // ─── Mute thông báo (per-user) ──────────────────────────────────────────
  // PATCH /mute body { isMuted, mutedUntil? } — trả Conversation đã normalize
  // isMuted/mutedUntil. mutedUntil null/bỏ = vĩnh viễn. Xem 22-mute-notifications.md.
  setMute: (id: string, body: { isMuted: boolean; mutedUntil?: string | null }) =>
    apiClient.patch<Conversation>(`/api/v1/conversations/${id}/mute`, { body }),

  /** Cập nhật nền hội thoại (null = xoá nền, "theme:key" = preset, "custom:{mediaId}" = ảnh). */
  updateBackground: (id: string, background: string | null) =>
    apiClient.patch<{ background: string | null }>(`/api/v1/conversations/${id}/background`, {
      body: { background },
    }),

  /** Nhóm GROUP mà mình và userId cùng tham gia — cursor-based (xem 26-common-groups.md). */
  listCommonGroups: (userId: string, params: { limit?: number; cursor?: string } = {}) =>
    apiClient.get<CommonGroupsPage>(`/api/v1/conversations/common-groups/${userId}`, {
      query: { limit: params.limit ?? 20, cursor: params.cursor },
    }),

  // ─── Cài đặt nhóm (đổi tên/mô tả/công khai + quyền hạn) ─────────────────────
  // Contract theo FRONTEND/28-group-settings.md. Trả Conversation đầy đủ đã cập nhật.

  /** Đổi tên/mô tả/công khai nhóm. Quyền theo settings.whoCanEditInfo (isPublic luôn cần ADMIN). */
  updateConversation: (id: string, input: UpdateConversationInput) =>
    apiClient.patch<Conversation>(`/api/v1/conversations/${id}`, { body: input }),

  /** Cập nhật quyền hạn nhóm (chỉ OWNER/ADMIN/MODERATOR). Tất cả field optional. */
  updateSettings: (id: string, input: Partial<GroupSettings>) =>
    apiClient.patch<Conversation>(`/api/v1/conversations/${id}/settings`, { body: input }),
} as const;
