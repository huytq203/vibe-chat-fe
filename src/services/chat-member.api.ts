import { apiClient } from '@/lib/api/client';
import type { BannedMember, Conversation } from '@/features/chat/types';

/** Transport cho thành viên nhóm: biệt danh, thêm/kick/rời, phân quyền, ban. */
export const memberApi = {
  // Đặt/đổi biệt danh per-conversation cho 1 thành viên (null/'' để xoá). Mọi thành viên đều thấy.
  // Trả Conversation đã cập nhật members[].nickname. Xem 03-conversations.md.
  setNickname: (conversationId: string, userId: string, nickname: string | null) =>
    apiClient.put<Conversation>(
      `/api/v1/conversations/${conversationId}/members/${userId}/nickname`,
      { body: { nickname } },
    ),

  // ─── Thành viên nhóm ────────────────────────────────────────────────────
  // addMembers nhận mảng userId (1–100); removeMember xoá 1 user. Xem 16.
  addMembers: (conversationId: string, userIds: string[]) =>
    apiClient.post<Conversation>(
      `/api/v1/conversations/${conversationId}/members`,
      { body: { userIds } },
    ),

  // Kick 1 thành viên (chỉ role cao hơn). Trả { ok: true } — refetch detail để cập nhật members.
  removeMember: (conversationId: string, userId: string) =>
    apiClient.delete<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/members/${userId}`,
    ),

  // Tự rời nhóm (OWNER không rời được — phải chuyển quyền hoặc xoá nhóm).
  leaveConversation: (conversationId: string) =>
    apiClient.post<{ ok: true }>(`/api/v1/conversations/${conversationId}/leave`),

  // ─── Phân quyền thành viên (CONTRACT GIẢ ĐỊNH — chờ BE xác nhận) ────────────
  // 2 cấp quyền: OWNER (trưởng nhóm) + ADMIN (phó nhóm). role='MEMBER' = gỡ quyền phó.

  /** Đặt vai trò 1 thành viên (cấp/gỡ quyền phó nhóm). Chỉ OWNER. */
  setMemberRole: (conversationId: string, userId: string, role: 'ADMIN' | 'MEMBER') =>
    apiClient.patch<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/members/${userId}/role`,
      { body: { role } },
    ),

  /** Nhượng quyền trưởng nhóm cho 1 thành viên. Chỉ OWNER. */
  transferOwnership: (conversationId: string, userId: string) =>
    apiClient.post<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/transfer-owner`,
      { body: { userId } },
    ),

  /** Chặn (ban) 1 thành viên — chỉ role thấp hơn. Trả { ok: true }. */
  banMember: (conversationId: string, userId: string) =>
    apiClient.post<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/members/${userId}/ban`,
    ),

  /** Bỏ chặn 1 thành viên. Trả { ok: true }. */
  unbanMember: (conversationId: string, userId: string) =>
    apiClient.delete<{ ok: true }>(
      `/api/v1/conversations/${conversationId}/members/${userId}/ban`,
    ),

  /** Danh sách thành viên đang bị chặn. Chuẩn hoá về BannedMember[] dù BE trả
   *  mảng trực tiếp hay bọc { items } / { data }. */
  listBannedMembers: async (conversationId: string): Promise<BannedMember[]> => {
    const res = await apiClient.get<unknown>(
      `/api/v1/conversations/${conversationId}/banned-members`,
    );
    if (Array.isArray(res)) return res as BannedMember[];
    const obj = res as { items?: BannedMember[]; data?: BannedMember[] } | null;
    return obj?.items ?? obj?.data ?? [];
  },
} as const;
