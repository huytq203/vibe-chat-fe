export type FriendshipStatus =
  | 'NONE'
  | 'PENDING_OUT'
  | 'PENDING_IN'
  | 'ACCEPTED'
  | 'BLOCKED_BY_ME';

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
