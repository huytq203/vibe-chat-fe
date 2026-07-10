// ─── Join request (xin vào nhóm) ───────────────────────────────────────────
// Tham chiếu FRONTEND/16-group-members.md.

export type JoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

/** Thông tin người gửi yêu cầu — chỉ có ở endpoint list (cho admin). */
export type JoinRequestRequester = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type JoinRequest = {
  id: string;
  conversationId: string;
  status: JoinRequestStatus;
  /** Lý do xin vào (hoặc lý do từ chối sau khi reject). */
  reason: string | null;
  requester: JoinRequestRequester | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
};
