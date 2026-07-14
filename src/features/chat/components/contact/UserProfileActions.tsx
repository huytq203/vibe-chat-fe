"use client";

import { Check, MessageCircle, UserMinus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  useRejectFriendRequest,
  useSendFriendRequest,
  useUnfriend,
} from "@/features/friends/hooks/use-mutations";
import type { FriendshipStatus } from "@/features/friends/types";

type UserProfileActionsProps = {
  userId: string;
  friendship: FriendshipStatus;
  isBot: boolean;
  onMessage: () => void;
  isMessaging: boolean;
};

/** Nút hành động trong modal hồ sơ user: nhắn tin / kết bạn / huỷ kết bạn theo friendship. Bot: chỉ nhắn tin. */
export function UserProfileActions({ userId, friendship, isBot, onMessage, isMessaging }: UserProfileActionsProps) {
  const sendMut = useSendFriendRequest();
  const cancelMut = useCancelFriendRequest();
  const unfriendMut = useUnfriend();
  const acceptMut = useAcceptFriendRequest();
  const rejectMut = useRejectFriendRequest();

  const messageBtn = (
    <Button variant="solid" size="sm" className="flex-1" isLoading={isMessaging} onClick={onMessage}>
      <MessageCircle className="h-4 w-4" />
      Nhắn tin
    </Button>
  );

  if (isBot) {
    return (
      <div className="px-6 pt-4">
        <div className="flex gap-2">{messageBtn}</div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-4">
      <div className="flex gap-2">
        {friendship === "ACCEPTED" && (
          <>
            {messageBtn}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              isLoading={unfriendMut.isPending}
              onClick={() => unfriendMut.mutate(userId)}>
              <UserMinus className="h-4 w-4" />
              Huỷ kết bạn
            </Button>
          </>
        )}

        {friendship === "PENDING_OUT" && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              isLoading={cancelMut.isPending}
              onClick={() => cancelMut.mutate(userId)}>
              <X className="h-4 w-4" />
              Huỷ lời mời
            </Button>
            {messageBtn}
          </>
        )}

        {friendship === "PENDING_IN" && (
          <>
            <Button
              variant="solid"
              size="sm"
              className="flex-1"
              isLoading={acceptMut.isPending}
              onClick={() => acceptMut.mutate(userId)}>
              <Check className="h-4 w-4" />
              Chấp nhận
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              isLoading={rejectMut.isPending}
              onClick={() => rejectMut.mutate(userId)}>
              <X className="h-4 w-4" />
              Từ chối
            </Button>
            {messageBtn}
          </>
        )}

        {friendship !== "ACCEPTED" &&
          friendship !== "PENDING_OUT" &&
          friendship !== "PENDING_IN" && (
            <>
              <Button
                variant="solid"
                size="sm"
                className="flex-1"
                isLoading={sendMut.isPending}
                onClick={() => sendMut.mutate({ targetUserId: userId, source: "GROUP" })}>
                <UserPlus className="h-4 w-4" />
                Kết bạn
              </Button>
              {messageBtn}
            </>
          )}
      </div>
    </div>
  );
}
