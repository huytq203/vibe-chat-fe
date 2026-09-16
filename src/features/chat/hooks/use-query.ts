'use client';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/services/chat.api';
import { usersApi } from '@/services/users.api';
import { chatKeys, userKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';
import type { Conversation, ReactionType, SharedContentType } from '@/features/chat/types';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';

// Cache tin nhắn giữ lâu (2h): realtime WS đã upsert tin mới vào cache nên không
// cần refetch REST mỗi lần mở lại conversation → tránh reload tin & media nặng.
// gcTime riêng 2h (> default global 30 phút) để cache không bị thu hồi khi rời lâu.
const MESSAGES_STALE_TIME = 2 * 60 * 60_000;
const MESSAGES_GC_TIME = 2 * 60 * 60_000;

export function useConversations(
  params: { page?: number; limit?: number; archived?: boolean; enabled?: boolean } = {},
) {
  const sidebarLimit = useChatUIStore((s) => s.sidebarLimit);
  const page = params.page ?? 1;
  // Không truyền limit → theo sidebarLimit (tăng khi bấm "Tải thêm"), mọi caller chung 1 key.
  const limit = params.limit ?? sidebarLimit;
  const archived = params.archived ?? false;
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: chatKeys.conversationList({ page, limit, archived }),
    queryFn: () => chatApi.listConversations({ page, limit, archived }),
    enabled: isAuthed && (params.enabled ?? true),
    staleTime: 30_000,
  });
}

/**
 * Danh sách nhóm (type GROUP) lazy-load cho modal Tìm kiếm & Kết bạn. BE lọc GROUP;
 * còn trang kế khi page trả đủ limit.
 */
export function useGroupsInfinite(limit = 30) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: chatKeys.groupList(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      chatApi.listConversations({ page: pageParam, limit, type: 'GROUP' }),
    getNextPageParam: (last, _all, lastPageParam) =>
      last.length === limit ? lastPageParam + 1 : undefined,
    enabled: isAuthed,
    staleTime: 30_000,
  });
}

export function useConversation(id: string | null) {
  const queryClient = useQueryClient();
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: id ? chatKeys.conversationDetail(id) : ['chat', 'conversation', 'null'],
    queryFn: () => chatApi.getConversation(id as string),
    enabled: Boolean(id) && isAuthed,
    // Detail chỉ khác list ở isUnlocked; mutation/WS (conversation:updated, pin, lock, member)
    // đã invalidate key này → không cần refetch mỗi lần mở lại.
    staleTime: 5 * 60_000,
    // Seed từ cache danh sách conversation (đã có members/lastMessage/settings) để
    // panel render NGAY khi mở chat — detail fetch chỉ chạy nền để làm tươi
    // (unread/isUnlocked). Tránh màn trống chờ round-trip GET /conversations/:id.
    placeholderData: () => {
      if (!id) return undefined;
      const lists = queryClient.getQueriesData<Conversation[]>({
        queryKey: chatKeys.conversationLists(),
      });
      for (const [, data] of lists) {
        const found = data?.find((c) => c.id === id);
        if (found) return found;
      }
      return undefined;
    },
  });
}

export function useMessages(conversationId: string | null) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return useInfiniteQuery({
    queryKey: conversationId ? chatKeys.messages(conversationId) : ['chat', 'messages', 'null'],
    queryFn: ({ pageParam }) =>
      chatApi.listMessages(conversationId as string, {
        limit: 30,
        before: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: Boolean(conversationId) && isAuthed,
    staleTime: MESSAGES_STALE_TIME,
    gcTime: MESSAGES_GC_TIME,
  });
}

const SHARED_PAGE_SIZE = 40;

/**
 * Nội dung chia sẻ theo loại (MEDIA/FILE/LINK) — cursor `before`, mỗi trang 40 tin.
 * Trước đây lấy-all (BE cap 500 tin + ký URL toàn bộ) → chuyển sang trang để mở tab nhanh.
 */
export function useSharedMessages(
  conversationId: string | null,
  type: SharedContentType,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: conversationId
      ? chatKeys.shared(conversationId, type)
      : ['chat', 'shared', 'null', type],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      chatApi.listShared(conversationId as string, {
        type,
        limit: SHARED_PAGE_SIZE,
        before: pageParam ?? undefined,
      }),
    getNextPageParam: (last) => last.nextCursor,
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

/**
 * Danh sách người đã thả cảm xúc trên 1 tin (popup "ai đã react"), lọc theo loại.
 * Cursor theo thời gian (`before` = nextCursor BE trả). type rỗng = tất cả.
 */
export function useReactors(
  conversationId: string,
  messageId: string,
  type: ReactionType | undefined,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: chatKeys.reactors(messageId, type),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      chatApi.listReactors(conversationId, messageId, { type, limit: 30, before: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(conversationId) && Boolean(messageId) && enabled,
    staleTime: 30_000,
  });
}
