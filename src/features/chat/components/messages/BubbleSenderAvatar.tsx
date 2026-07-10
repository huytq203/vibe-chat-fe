"use client";

import { useState } from "react";
import { Avatar } from "@/features/chat/components/common/Avatar";
import { UserProfileDialog } from "@/features/chat/components/contact/UserProfileDialog";

type BubbleSenderAvatarProps = {
  userId: string;
  senderName?: string | null;
  senderAvatarUrl?: string | null;
  showAvatar: boolean;
};

/** Cột avatar người gửi (chỉ tin của người khác). Bấm avatar → mở hồ sơ user. */
export function BubbleSenderAvatar({
  userId,
  senderName,
  senderAvatarUrl,
  showAvatar,
}: BubbleSenderAvatarProps) {
  const [senderProfileOpen, setSenderProfileOpen] = useState(false);
  return (
    <div className="w-7 shrink-0">
      {showAvatar && (
        <button
          type="button"
          onClick={() => setSenderProfileOpen(true)}
          className="cursor-pointer"
        >
          <Avatar
            name={senderName ?? null}
            src={senderAvatarUrl}
            size="sm"
            className="!h-7 !w-7 !rounded-lg"
          />
        </button>
      )}
      <UserProfileDialog
        open={senderProfileOpen}
        onOpenChange={setSenderProfileOpen}
        userId={userId}
      />
    </div>
  );
}
