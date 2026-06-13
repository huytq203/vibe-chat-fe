// Share link cá nhân / nhóm + QR. Tham chiếu FRONTEND/25-share-links.md.

export type ShareLinkType = 'USER' | 'GROUP';

export type ShareLink = {
  code: string;
  type: ShareLinkType;
  /** URL công khai {APP_PUBLIC_URL}/i/{code} (BE trả sẵn). */
  url: string;
  /** Ảnh QR dạng data URL PNG — gắn thẳng vào <img src>. */
  qrDataUrl: string;
  targetId: string;
  label: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isRevoked: boolean;
  createdAt: string;
};

export type CreateShareLinkInput = {
  type: ShareLinkType;
  /** Bắt buộc khi type=GROUP (uuid nhóm). USER bỏ qua. */
  targetId?: string;
  maxUses?: number;
  expiresInDays?: number;
  label?: string;
};

export type ShareLinkUserPreview = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ShareLinkGroupPreview = {
  id: string;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
};

export type ResolveShareLink = {
  code: string;
  type: ShareLinkType;
  url: string;
  isActive: boolean;
  isRevoked: boolean;
  isExpired: boolean;
  isExhausted: boolean;
  user: ShareLinkUserPreview | null;
  group: ShareLinkGroupPreview | null;
};

/** Hồ sơ đầy đủ trả khi dùng link USER (để hiển thị + kết bạn). */
export type ShareLinkProfile = {
  id: string;
  username: string;
  displayName: string | null;
  customName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  gender: string;
  dateOfBirth: string | null;
  status: string;
  isMe: boolean;
  friendship: string;
};

export type UseShareLinkResult =
  | { type: 'USER'; user: ShareLinkProfile; group: null }
  | {
      type: 'GROUP';
      user: null;
      // `pending: true` khi nhóm bật joinApproval → tạo join-request chờ duyệt thay vì
      // vào thẳng (xem 28-group-settings.md §5).
      group: { conversationId: string; joined: boolean; pending?: boolean };
    };
