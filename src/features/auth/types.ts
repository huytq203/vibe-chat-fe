export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'DELETED';
/** Quyền riêng tư hồ sơ — PRIVATE thì ẩn khỏi search, chỉ tiếp cận qua link/QR (xem 30). */
export type ProfileVisibility = 'PUBLIC' | 'PRIVATE';

/**
 * Hồ sơ user — đúng shape `UserResponseDto` của `GET /api/v1/users/me` (chat backend).
 * Xem 01-authentication.md §1.5: bỏ phone/isOnline/lastSeenAt/createdAt; online/last-seen lấy
 * qua Presence. `id` = keycloakId, dùng cho senderId/memberIds/userId... ở mọi nơi.
 */
export type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  status: UserStatus;
  /** Chế độ hiển thị hồ sơ (xem 30-profile-visibility.md). */
  visibility: ProfileVisibility;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
};

export type AuthSession = {
  tokens: AuthTokens;
  user: AuthUser;
};

/** Đăng ký xong: BE chưa trả token — chuyển sang màn nhập OTP với email này. */
export type RegisterResult = {
  message: string;
  email: string;
};
