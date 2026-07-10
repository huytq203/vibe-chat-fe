import { apiClient } from '@/lib/api/client';
import type { JoinRequest } from '@/features/chat/types';

// ─── Yêu cầu vào nhóm (join request) ────────────────────────────────────
// Endpoint & contract theo FRONTEND/16-group-members.md.

/** Transport cho yêu cầu xin vào nhóm: list/gửi/duyệt/từ chối/huỷ. */
export const joinRequestApi = {
  /** Danh sách yêu cầu PENDING (cho OWNER/ADMIN/MOD), kèm thông tin requester. */
  listJoinRequests: (
    conversationId: string,
    params: { page?: number; limit?: number } = {},
  ) =>
    apiClient.get<JoinRequest[]>(
      `/api/v1/conversations/${conversationId}/join-requests`,
      { query: { page: params.page ?? 1, limit: params.limit ?? 50 } },
    ),

  /** User ngoài gửi yêu cầu xin vào nhóm công khai (reason ≤ 300 ký tự, optional). */
  requestJoin: (conversationId: string, reason?: string) =>
    apiClient.post<JoinRequest>(
      `/api/v1/conversations/${conversationId}/join-requests`,
      { body: { reason } },
    ),

  /** Duyệt yêu cầu → thêm người gửi làm MEMBER. */
  acceptJoinRequest: (conversationId: string, requestId: string) =>
    apiClient.post<JoinRequest>(
      `/api/v1/conversations/${conversationId}/join-requests/${requestId}/accept`,
    ),

  /** Từ chối yêu cầu (reason optional). */
  rejectJoinRequest: (conversationId: string, requestId: string, reason?: string) =>
    apiClient.post<JoinRequest>(
      `/api/v1/conversations/${conversationId}/join-requests/${requestId}/reject`,
      { body: { reason } },
    ),

  /** Người gửi tự huỷ yêu cầu của mình khi còn PENDING. */
  cancelJoinRequest: (conversationId: string, requestId: string) =>
    apiClient.delete<JoinRequest>(
      `/api/v1/conversations/${conversationId}/join-requests/${requestId}`,
    ),
} as const;
