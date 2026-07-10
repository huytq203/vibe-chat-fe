/** Thứ hạng quyền: OWNER > ADMIN > MODERATOR > MEMBER (xem 16-group-members.md). */
export type MemberRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export type ConversationMember = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  nickname: string | null;
  role: MemberRole;
};

/** Thành viên đang bị chặn (xem 28-group-settings.md §4) — từ GET /conversations/{id}/banned-members. */
export type BannedMember = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** Thời điểm bị chặn (nếu BE trả). */
  bannedAt?: string | null;
};

/** Phạm vi quyền hạn nhóm: ADMIN = OWNER/ADMIN/MODERATOR; ALL = mọi thành viên ACTIVE. */
export type PermissionScope = 'ADMIN' | 'ALL';

/** Cài đặt quyền hạn nhóm GROUP/CHANNEL (xem 28-group-settings.md). */
export type GroupSettings = {
  /** Cho vào nhóm qua link/QR chia sẻ. */
  joinByLink: boolean;
  /** Vào qua link/QR phải được phê duyệt (tạo join-request thay vì vào thẳng). */
  joinApproval: boolean;
  /** Ai được sửa tên/mô tả nhóm. */
  whoCanEditInfo: PermissionScope;
  /** Quyền chat — ai được gửi tin. ADMIN = khoá nhóm. */
  whoCanSend: PermissionScope;
  /** Ai được ghim/bỏ ghim tin. */
  whoCanPin: PermissionScope;
  /** Bật badge đánh dấu tin của trưởng/phó nhóm trên UI. */
  markLeaderMessages: boolean;
};
