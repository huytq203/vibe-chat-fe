import type { Gender, UserStatus } from '@/features/auth/types';

export type FriendshipStatus =
  | 'NONE'
  | 'PENDING_OUT'
  | 'PENDING_IN'
  | 'ACCEPTED'
  | 'BLOCKED_BY_ME';

/** GET /users/:id — UserProfileResponseDto (viewer-scoped). Xem 24-profile.md §3. */
export type UserProfile = {
  id: string;
  username: string;
  /** Chỉ có giá trị khi isMe=true. */
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  status: UserStatus;
  isMe: boolean;
  friendship: FriendshipStatus;
};

export type FriendRequestSource =
  | 'PHONE'
  | 'SEARCH'
  | 'QR'
  | 'GROUP'
  | 'LINK'
  | 'SUGGEST';

export type UserSummary = {
  id: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type UserSearchItem = UserSummary & {
  friendship: FriendshipStatus;
  mutualFriendsCount?: number;
};

export type UserSearchPage = {
  items: UserSearchItem[];
  nextCursor: string | null;
};

export type FriendRequest = {
  user: UserSummary;
  status: FriendshipStatus;
  nickname: string | null;
  createdAt: string;
  acceptedAt: string | null;
};

export type FriendRequestPage = {
  items: FriendRequest[];
  nextCursor: string | null;
};

export type SendFriendRequestInput = {
  targetUserId: string;
  nickname?: string;
  source?: FriendRequestSource;
};

export type FriendRequestActionResult = {
  targetUserId: string;
  status: FriendshipStatus;
};

export type BlockedUserItem = {
  user: UserSummary;
  reason: string | null;
  createdAt: string;
};

export type BlockListPage = {
  items: BlockedUserItem[];
  nextCursor: string | null;
};

export type BlockActionResult = {
  targetUserId: string;
};

export type BlockUserInput = {
  targetUserId: string;
  reason?: string;
};

export type FriendUpdateType =
  | 'REQUEST_SENT'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_CANCELLED'
  | 'UNFRIENDED';

export type FriendUpdateEvent = {
  type: FriendUpdateType;
  otherUserId: string;
  status: 'PENDING_IN' | 'PENDING_OUT' | 'ACCEPTED' | 'NONE';
  at: string;
};
