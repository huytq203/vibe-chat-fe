"use client";

import { useState } from "react";
import { Share2, ShieldAlert } from "lucide-react";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import { FriendPickerDialog } from "./FriendPickerDialog";
import { useShareContactToFriend } from "@/features/chat/hooks/useShareContactToFriend";

type UserProfileExtraActionsProps = {
  isFriend: boolean;
  /** Id user đang xem — dùng làm contactUserId khi chia sẻ + targetId khi báo cáo. */
  userId: string;
};

/** Hàng tuỳ chọn phụ dưới "Nhóm chung": chia sẻ liên hệ (chỉ bạn bè) + báo cáo người dùng. */
export function UserProfileExtraActions({ isFriend, userId }: UserProfileExtraActionsProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const { share, isPending } = useShareContactToFriend(userId);

  return (
    <div className="border-t border-border px-6 py-2">
      {isFriend && (
        <button
          type="button"
          onClick={() => setFriendPickerOpen(true)}
          disabled={isPending}
          className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          Chia sẻ liên hệ
        </button>
      )}
      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-secondary">
        <ShieldAlert className="h-4 w-4" />
        Báo cáo người dùng
      </button>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="USER"
        targetId={userId}
      />
      <FriendPickerDialog
        open={friendPickerOpen}
        onOpenChange={setFriendPickerOpen}
        onPick={share}
      />
    </div>
  );
}
