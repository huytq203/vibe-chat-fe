/**
 * Tập trung query key factories cho toàn dự án.
 * Mỗi scope một namespace — hook trong features/<x>/hooks/* import từ đây.
 * Centralize để tránh chồng chéo / duplicate key khi nhiều feature share data.
 */

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
} as const;

export const userKeys = {
  all: ['users'] as const,
  search: (q: string, limit: number) =>
    [...userKeys.all, 'search', q, limit] as const,
} as const;

export const friendKeys = {
  all: ['friends'] as const,
  list: () => [...friendKeys.all, 'list'] as const,
  incoming: () => [...friendKeys.all, 'requests', 'incoming'] as const,
  outgoing: () => [...friendKeys.all, 'requests', 'outgoing'] as const,
} as const;

export const blockKeys = {
  all: ['blocks'] as const,
  list: () => [...blockKeys.all, 'list'] as const,
} as const;

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversationLists: () => [...chatKeys.conversations(), 'list'] as const,
  conversationList: (params: { page: number; limit: number }) =>
    [...chatKeys.conversationLists(), params] as const,
  conversationDetail: (id: string) =>
    [...chatKeys.conversations(), 'detail', id] as const,
  messages: (conversationId: string) =>
    [...chatKeys.all, 'messages', conversationId] as const,
  presence: (userIds: string[]) =>
    [...chatKeys.all, 'presence', [...userIds].sort()] as const,
} as const;
