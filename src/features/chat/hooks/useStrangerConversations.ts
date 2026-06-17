"use client";

import { useCallback, useMemo } from "react";
import { useFriends } from "@/features/friends/hooks/use-query";
import type { Conversation } from "@/features/chat/types";

type UseStrangerConversationsResult = {
  /** True nếu hội thoại 1-1 với người chưa kết bạn (người lạ). */
  isStranger: (c: Conversation) => boolean;
  /** Danh sách hội thoại người lạ (chưa lọc theo tab/search). */
  strangerConversations: Conversation[];
  /** Số hội thoại người lạ đang có tin chưa đọc. */
  strangerUnreadCount: number;
};

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

  const isStranger = useCallback(
    (c: Conversation) => {
      if (c.type !== "DIRECT") return false;
      const otherId = c.memberIds.find((id) => id !== meId);
      return Boolean(otherId) && !friendIds.has(otherId as string);
    },
    [friendIds, meId],
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
