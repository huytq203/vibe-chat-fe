"use client";

import { Share2, ShieldAlert } from "lucide-react";

type UserProfileExtraActionsProps = {
  isFriend: boolean;
  isPending: boolean;
  onShareContact: () => void;
  onReport: () => void;
};

export function UserProfileExtraActions({
  isFriend,
  isPending,
  onShareContact,
  onReport,
}: UserProfileExtraActionsProps) {
  return (
    <div className="border-t border-border px-6 py-2">
      {isFriend && (
        <button
          type="button"
          onClick={onShareContact}
          disabled={isPending}
          className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Share2 className="h-4 w-4 text-muted-foreground" />
          Chia sẻ liên hệ
        </button>
      )}
      <button
        type="button"
        onClick={onReport}
        className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-secondary"
      >
        <ShieldAlert className="h-4 w-4" />
        Báo cáo người dùng
      </button>
    </div>
  );
}
