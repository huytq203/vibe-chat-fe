"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useFriends } from "@/features/friends/hooks/use-query";
import { isBotUser } from "@/features/friends/utils";
import { getJSON, setJSON } from "@/lib/storage/local-storage";
import type { Conversation } from "@/features/chat/types";

type UseStrangerConversationsResult = {
  /** True nếu hội thoại 1-1 với người chưa kết bạn (người lạ). */
  isStranger: (c: Conversation) => boolean;
  /** Danh sách hội thoại người lạ (chưa lọc theo tab/search). */
  strangerConversations: Conversation[];
  /** Số hội thoại người lạ đang có tin chưa đọc. */
  strangerUnreadCount: number;
};

const KEY_PREFIX = "stranger-replied-ids";
const EMPTY_SET: ReadonlySet<string> = new Set();

/** Cache ngoài React theo meId — nguồn cho useSyncExternalStore (đồng bộ với localStorage). */
const repliedIdsCache = new Map<string, ReadonlySet<string>>();
const listeners = new Set<() => void>();

function isDirectBotConversation(c: Conversation, meId: string | null): boolean {
  if (c.type !== "DIRECT") return false;
  const otherId = c.memberIds.find((id) => id !== meId);
  if (!otherId) return false;
  return c.members?.some((m) => m.userId === otherId && isBotUser(m)) ?? false;
}

function loadRepliedIds(meId: string): ReadonlySet<string> {
  return new Set(getJSON<string[]>(`${KEY_PREFIX}:${meId}`, []));
}

function getRepliedIds(meId: string | null): ReadonlySet<string> {
  if (!meId) return EMPTY_SET;
  let ids = repliedIdsCache.get(meId);
  if (!ids) {
    ids = loadRepliedIds(meId);
    repliedIdsCache.set(meId, ids);
  }
  return ids;
}

/** Đánh dấu các hội thoại đã reply — ghi nhớ vĩnh viễn, sticky dù người kia nhắn tiếp. */
function markReplied(meId: string, conversationIds: string[]): void {
  const current = repliedIdsCache.get(meId) ?? loadRepliedIds(meId);
  const next = new Set(current);
  let changed = false;
  for (const id of conversationIds) {
    if (next.has(id)) continue;
    next.add(id);
    changed = true;
  }
  if (!changed) return;
  repliedIdsCache.set(meId, next);
  setJSON(`${KEY_PREFIX}:${meId}`, Array.from(next));
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Tách hội thoại "người lạ" (DIRECT với người chưa kết bạn) khỏi danh sách chính. */
export function useStrangerConversations(
  conversations: Conversation[],
  meId: string | null,
): UseStrangerConversationsResult {
  const { data: friendsData } = useFriends();

  const friendIds = useMemo(
    () => new Set((friendsData?.items ?? []).map((it) => it.user.id)),
    [friendsData],
  );

  const repliedIds = useSyncExternalStore(
    subscribe,
    () => getRepliedIds(meId),
    () => EMPTY_SET,
  );

  // Mình vừa gửi tin trong hội thoại DIRECT nào → đánh dấu "đã reply" vĩnh viễn,
  // để người lạ nhắn tiếp không kéo hội thoại quay lại danh sách người lạ.
  useEffect(() => {
    if (!meId) return;
    const repliedNow = conversations
      .filter((c) => c.type === "DIRECT" && c.lastMessage?.senderId === meId)
      .map((c) => c.id);
    if (repliedNow.length > 0) markReplied(meId, repliedNow);
  }, [conversations, meId]);

  const isStranger = useCallback(
    (c: Conversation) => {
      if (c.type !== "DIRECT") return false;
      if (isDirectBotConversation(c, meId)) return false;
      const otherId = c.memberIds.find((id) => id !== meId);
      if (!otherId || friendIds.has(otherId)) return false;
      // Tin cuối cùng do mình gửi → chắc chắn không phải người lạ (phản hồi tức thời,
      // không cần chờ effect đánh dấu). Đã từng reply ít nhất 1 lần → cũng không còn
      // là "người lạ" nữa, kể cả khi người kia nhắn tiếp sau đó (chỉ tin nhắn ĐẦU TIÊN
      // mới tính là người lạ).
      if (meId && c.lastMessage?.senderId === meId) return false;
      if (repliedIds.has(c.id)) return false;
      return true;
    },
    [friendIds, meId, repliedIds],
  );

  const strangerConversations = useMemo(
    () => conversations.filter((c) => !c.isLocked && isStranger(c)),
    [conversations, isStranger],
  );

  const strangerUnreadCount = useMemo(
    () => strangerConversations.reduce((sum, c) => sum + (c.unreadCount > 0 ? 1 : 0), 0),
    [strangerConversations],
  );

  return { isStranger, strangerConversations, strangerUnreadCount };
}
