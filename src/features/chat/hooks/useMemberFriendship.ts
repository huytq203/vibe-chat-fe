"use client";

import { useCallback, useMemo } from "react";
import { useFriends, useOutgoingFriendRequests } from "@/features/friends/hooks/use-query";
import { useCancelFriendRequest, useSendFriendRequest } from "@/features/friends/hooks/use-mutations";

export const MemberFriendState = {
  NONE: "none",
  PENDING: "pending",
  FRIEND: "friend",
} as const;
export type MemberFriendState = (typeof MemberFriendState)[keyof typeof MemberFriendState];

type UseMemberFriendshipResult = {
  getState: (userId: string) => MemberFriendState;
  sendFriend: (userId: string) => void;
  cancelFriend: (userId: string) => void;
  isSending: (userId: string) => boolean;
  isCancelling: (userId: string) => boolean;
};

/** Tra cứu trạng thái bạn bè của thành viên nhóm + gửi/huỷ lời mời. Dùng lại cache friends/outgoing. */
export function useMemberFriendship(): UseMemberFriendshipResult {
  const friendsQuery = useFriends();
  const outgoingQuery = useOutgoingFriendRequests();
  const sendMut = useSendFriendRequest();
  const cancelMut = useCancelFriendRequest();

  const friendIds = useMemo(
    () => new Set((friendsQuery.data?.items ?? []).map((it) => it.user.id)),
    [friendsQuery.data],
  );
  const pendingIds = useMemo(
    () =>
      new Set(
        (outgoingQuery.data?.items ?? [])
          .filter((it) => it.status === "PENDING_OUT")
          .map((it) => it.user.id),
      ),
    [outgoingQuery.data],
  );

  const getState = useCallback(
    (userId: string): MemberFriendState => {
      if (friendIds.has(userId)) return MemberFriendState.FRIEND;
      if (pendingIds.has(userId)) return MemberFriendState.PENDING;
      return MemberFriendState.NONE;
    },
    [friendIds, pendingIds],
  );

  const sendFriend = useCallback(
    (userId: string) => sendMut.mutate({ targetUserId: userId, source: "GROUP" }),
    [sendMut],
  );

  const cancelFriend = useCallback((userId: string) => cancelMut.mutate(userId), [cancelMut]);

  const isSending = useCallback(
    (userId: string) => sendMut.isPending && sendMut.variables?.targetUserId === userId,
    [sendMut.isPending, sendMut.variables],
  );

  const isCancelling = useCallback(
    (userId: string) => cancelMut.isPending && cancelMut.variables === userId,
    [cancelMut.isPending, cancelMut.variables],
  );

  return { getState, sendFriend, cancelFriend, isSending, isCancelling };
}
