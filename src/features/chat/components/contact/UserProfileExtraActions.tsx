"use client";

import { useState } from "react";
import { Share2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { ReportDialog } from "@/features/reports/components/ReportDialog";

type UserProfileExtraActionsProps = {
  isFriend: boolean;
  /** Id user đang xem — dùng làm targetId khi báo cáo. */
  userId: string;
};

const COMING_SOON = () => toast.info("Tính năng đang phát triển");

/** Hàng tuỳ chọn phụ dưới "Nhóm chung": chia sẻ liên hệ (chỉ bạn bè) + báo cáo người dùng. */
export function UserProfileExtraActions({ isFriend, userId }: UserProfileExtraActionsProps) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="border-t border-border px-6 py-2">
      <button
        type="button"
        onClick={COMING_SOON}
        disabled={!isFriend}
        className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
        <Share2 className="h-4 w-4 text-muted-foreground" />
        Chia sẻ liên hệ
      </button>
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
    </div>
  );
}
