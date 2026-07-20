/**
 * Tập trung query key factories cho toàn dự án.
 * Mỗi scope một namespace — hook trong features/<x>/hooks/* import từ đây.
 * Centralize để tránh chồng chéo / duplicate key khi nhiều feature share data.
 */

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
} as const;

export const sessionKeys = {
  all: ['sessions'] as const,
  list: () => [...sessionKeys.all, 'list'] as const,
} as const;

export const userKeys = {
  all: ['users'] as const,
  search: (q: string, limit: number) =>
    [...userKeys.all, 'search', q, limit] as const,
  inlineBots: (prefix: string) => [...userKeys.all, 'inline-bots', prefix] as const,
  profile: (id: string) => [...userKeys.all, 'profile', id] as const,
  privacy: () => [...userKeys.all, 'privacy'] as const,
} as const;

export const friendKeys = {
  all: ['friends'] as const,
  list: () => [...friendKeys.all, 'list'] as const,
  // Tách khỏi list(): list() giữ shape FriendRequestPage 1 trang; key này giữ InfiniteData.
  listInfinite: () => [...friendKeys.all, 'list', 'infinite'] as const,
  incoming: () => [...friendKeys.all, 'requests', 'incoming'] as const,
  outgoing: () => [...friendKeys.all, 'requests', 'outgoing'] as const,
} as const;

export const blockKeys = {
  all: ['blocks'] as const,
  list: () => [...blockKeys.all, 'list'] as const,
} as const;

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params: { page: number; limit: number; unreadOnly: boolean }) =>
    [...notificationKeys.lists(), params] as const,
  // Tách khỏi lists(): realtime patch lists() theo shape NotificationPage,
  // còn key này giữ InfiniteData — chỉ invalidate, không patch.
  infinite: () => [...notificationKeys.all, 'infinite'] as const,
  unreadCount: (category?: string) =>
    category
      ? ([...notificationKeys.all, 'unread-count', category] as const)
      : ([...notificationKeys.all, 'unread-count'] as const),
} as const;

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversationLists: () => [...chatKeys.conversations(), 'list'] as const,
  conversationList: (params: { page: number; limit: number }) =>
    [...chatKeys.conversationLists(), params] as const,
  // Danh sách nhóm (lazy-load) cho modal Tìm kiếm & Kết bạn — InfiniteData theo page.
  groupList: () => [...chatKeys.conversations(), 'group-list'] as const,
  conversationDetail: (id: string) =>
    [...chatKeys.conversations(), 'detail', id] as const,
  lockedConversations: () => [...chatKeys.conversations(), 'locked'] as const,
  joinRequests: (conversationId: string) =>
    [...chatKeys.conversations(), 'join-requests', conversationId] as const,
  bannedMembers: (conversationId: string) =>
    [...chatKeys.conversations(), 'banned', conversationId] as const,
  messages: (conversationId: string) =>
    [...chatKeys.all, 'messages', conversationId] as const,
  pinnedMessages: (conversationId: string) =>
    [...chatKeys.all, 'pinned', conversationId] as const,
  // Danh sách người đã thả cảm xúc trên 1 tin (popup), lọc theo loại (rỗng = tất cả).
  reactors: (messageId: string, type?: string) =>
    [...chatKeys.all, 'reactors', messageId, type ?? 'ALL'] as const,
  shared: (conversationId: string, type: string) =>
    [...chatKeys.all, 'shared', conversationId, type] as const,
  // Tin nhắn hẹn giờ của chính mình trong 1 conversation.
  scheduledMessages: (conversationId: string) =>
    [...chatKeys.all, 'scheduled', conversationId] as const,
  search: (
    conversationId: string,
    filters: { key: string; senderId?: string; from?: string; to?: string },
  ) =>
    [
      ...chatKeys.all,
      'search',
      conversationId,
      filters.key,
      filters.senderId ?? '',
      filters.from ?? '',
      filters.to ?? '',
    ] as const,
  presence: (userIds: string[]) =>
    [...chatKeys.all, 'presence', [...userIds].sort()] as const,
  commonGroups: (userId: string) =>
    [...chatKeys.all, 'common-groups', userId] as const,
} as const;

export const callKeys = {
  all: ['call'] as const,
  history: (conversationId?: string) =>
    [...callKeys.all, 'history', conversationId ?? 'all'] as const,
  detail: (callId: string) => [...callKeys.all, 'detail', callId] as const,
} as const;

export const shareLinkKeys = {
  all: ['share-links'] as const,
  my: () => [...shareLinkKeys.all, 'me'] as const,
  resolve: (code: string) => [...shareLinkKeys.all, 'resolve', code] as const,
} as const;

export const pollKeys = {
  all: ['polls'] as const,
  detail: (pollId: string) => [...pollKeys.all, 'detail', pollId] as const,
} as const;

export const mediaKeys = {
  all: ['media'] as const,
  detail: (id: string) => [...mediaKeys.all, 'detail', id] as const,
} as const;

export const myStoreKeys = {
  all: ['my-store'] as const,
  conversation: () => [...myStoreKeys.all, 'conversation'] as const,
  messages: () => [...myStoreKeys.all, 'messages'] as const,
  folders: () => [...myStoreKeys.all, 'folders'] as const,
  folder: (id: string) => [...myStoreKeys.all, 'folder', id] as const,
  files: (folderId: string) => [...myStoreKeys.all, 'files', folderId] as const,
  quota: () => [...myStoreKeys.all, 'quota'] as const,
} as const;

export const botKeys = {
  all: ['bots'] as const,
  list: (page: number, limit: number) => [...botKeys.all, 'list', page, limit] as const,
} as const;

export const botTokenKeys = {
  all: ['bot-tokens'] as const,
  list: (botId: string) => [...botTokenKeys.all, 'list', botId] as const,
} as const;
