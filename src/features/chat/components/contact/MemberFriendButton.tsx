"use client";

import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { MemberFriendState } from "@/features/chat/hooks/useMemberFriendship";

type MemberFriendButtonProps = {
  state: MemberFriendState;
  name: string;
  isSending: boolean;
  isCancelling: boolean;
  onAdd: () => void;
  onCancel: () => void;
};

export function MemberFriendButton({
  state,
  name,
  isSending,
  isCancelling,
  onAdd,
  onCancel,
}: MemberFriendButtonProps) {
  if (state === MemberFriendState.FRIEND) return null;

  if (state === MemberFriendState.PENDING) {
    return (
      <Button
        variant="outline"
        size="xs"
        isLoading={isCancelling}
        onClick={onCancel}
        className="shrink-0"
        title={`Huỷ lời mời kết bạn với ${name}`}
        aria-label={`Huỷ lời mời kết bạn với ${name}`}>
        Huỷ lời mời
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="xs"
      isLoading={isSending}
      onClick={onAdd}
      className="shrink-0"
      title={`Kết bạn với ${name}`}
      aria-label={`Kết bạn với ${name}`}>
      <UserPlus className="h-3.5 w-3.5" />
      Kết bạn
    </Button>
  );
}
