'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { chatApi } from '@/services/chat.api';
import { usersApi } from '@/services/users.api';
import { chatKeys, userKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';
import type { SharedContentType } from '@/features/chat/types';

// Cache tin nhắn giữ lâu (2h): realtime WS đã upsert tin mới vào cache nên không
// cần refetch REST mỗi lần mở lại conversation → tránh reload tin & media nặng.
// gcTime riêng 2h (> default global 30 phút) để cache không bị thu hồi khi rời lâu.
const MESSAGES_STALE_TIME = 2 * 60 * 60_000;
const MESSAGES_GC_TIME = 2 * 60 * 60_000;

export function useConversations(params: { page?: number; limit?: number } = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 30;
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: chatKeys.conversationList({ page, limit }),
    queryFn: () => chatApi.listConversations({ page, limit }),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}

/**
 * Danh sách nhóm (type GROUP) lazy-load cho modal Tìm kiếm & Kết bạn. Phân trang theo
 * `page` của listConversations rồi lọc GROUP phía FE; còn trang kế khi page trả đủ limit.
 */
export function useGroupsInfinite(limit = 30) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: chatKeys.groupList(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => chatApi.listConversations({ page: pageParam, limit }),
    getNextPageParam: (last, _all, lastPageParam) =>
      last.length === limit ? lastPageParam + 1 : undefined,
    enabled: isAuthed,
    staleTime: 30_000,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: id ? chatKeys.conversationDetail(id) : ['chat', 'conversation', 'null'],
    queryFn: () => chatApi.getConversation(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: conversationId ? chatKeys.messages(conversationId) : ['chat', 'messages', 'null'],
    queryFn: ({ pageParam }) =>
      chatApi.listMessages(conversationId as string, {
        limit: 30,
        before: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: Boolean(conversationId),
    staleTime: MESSAGES_STALE_TIME,
    gcTime: MESSAGES_GC_TIME,
  });
}

/**
 * Nội dung chia sẻ theo loại (MEDIA/FILE/LINK) qua endpoint BE riêng — lấy ĐỦ toàn bộ
 * trong 1 lần gọi (không `limit`). "Xem thêm" mở rộng hiển thị phía FE, không fetch thêm.
 * Gọi qua useSharedContent.
 */
export function useSharedMessages(
  conversationId: string | null,
  type: SharedContentType,
  enabled: boolean,
) {
  return useQuery({
    queryKey: conversationId
      ? chatKeys.shared(conversationId, type)
      : ['chat', 'shared', 'null', type],
    queryFn: () => chatApi.listShared(conversationId as string, { type }),
    enabled: enabled && Boolean(conversationId),
    staleTime: 60_000,
  });
}

export type MessageSearchFilters = {
  key: string;
  senderId?: string;
  from?: string;
  to?: string;
};

/**
 * Tìm tin nhắn TEXT trong 1 conversation (toàn bộ lịch sử) — phân trang cursor.
 * Chỉ fetch khi `key` đã trim có ít nhất 1 ký tự. Xem FRONTEND/21-message-search.md.
 */
export function useMessageSearch(conversationId: string | null, filters: MessageSearchFilters) {
  const key = filters.key.trim();
  return useInfiniteQuery({
    queryKey: conversationId
      ? chatKeys.search(conversationId, { ...filters, key })
      : ['chat', 'search', 'null'],
    queryFn: ({ pageParam }) =>
      chatApi.searchMessages(conversationId as string, {
        key,
        limit: 20,
        before: pageParam ?? undefined,
        senderId: filters.senderId,
        from: filters.from,
        to: filters.to,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: Boolean(conversationId) && key.length >= 1,
    staleTime: 30_000,
  });
}

/** Danh sách yêu cầu vào nhóm đang PENDING — chỉ fetch khi user có quyền duyệt. */
export function useJoinRequests(conversationId: string | null, enabled = true) {
  return useQuery({
    queryKey: conversationId
      ? chatKeys.joinRequests(conversationId)
      : ['chat', 'join-requests', 'null'],
    queryFn: () => chatApi.listJoinRequests(conversationId as string),
    enabled: Boolean(conversationId) && enabled,
    staleTime: 15_000,
  });
}

/**
 * Danh sách tin đang ghim của 1 conversation (tối đa 5, mới ghim đứng đầu).
 * Realtime `conversation:pin_updated` invalidate key này (xem useChatRealtime).
 */
export function usePinnedMessages(conversationId: string | null, enabled = true) {
  return useQuery({
    queryKey: conversationId
      ? chatKeys.pinnedMessages(conversationId)
      : ['chat', 'pinned', 'null'],
    queryFn: () => chatApi.listPinnedMessages(conversationId as string),
    enabled: Boolean(conversationId) && enabled,
    staleTime: 60_000,
  });
}

/**
 * Danh sách thành viên đang bị chặn của 1 nhóm (xem 28-group-settings.md §4).
 * Chỉ fetch khi mở panel quản lý chặn (enabled).
 */
export function useBannedMembers(conversationId: string | null, enabled = true) {
  return useQuery({
    queryKey: conversationId
      ? chatKeys.bannedMembers(conversationId)
      : ['chat', 'banned', 'null'],
    queryFn: () => chatApi.listBannedMembers(conversationId as string),
    enabled: Boolean(conversationId) && enabled,
    staleTime: 60_000,
  });
}

export function usePresence(userIds: string[]) {
  const enabled = userIds.length > 0;
  // Realtime qua WebSocket (event `presence:update` trong useChatRealtime), KHÔNG poll.
  // REST chỉ lấy snapshot ban đầu; sau reconnect onReconnect() invalidate chatKeys.all
  // → query này tự refetch để bù event đã miss trong gap mất kết nối.
  return useQuery({
    queryKey: chatKeys.presence(userIds),
    queryFn: () => chatApi.getPresenceBulk(userIds),
    enabled,
    staleTime: 60_000,
  });
}

export function useLockedConversations() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: chatKeys.lockedConversations(),
    queryFn: () => chatApi.listLockedConversations(),
    enabled: isAuthed,
    staleTime: 30_000,
  });
}

/** Hồ sơ user khác (kèm isMe, friendship) — dùng cho modal xem profile. */
export function useUserProfile(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: userKeys.profile(userId ?? 'null'),
    queryFn: () => usersApi.getProfile(userId as string),
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}

/** Nhóm chung với userId — cursor-based. KHÔNG gọi với chính mình (BE trả 400). */
export function useCommonGroups(userId: string | null, enabled = true) {
  return useInfiniteQuery({
    queryKey: chatKeys.commonGroups(userId ?? 'null'),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      chatApi.listCommonGroups(userId as string, { limit: 20, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}
