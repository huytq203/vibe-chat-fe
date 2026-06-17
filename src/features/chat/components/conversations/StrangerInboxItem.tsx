"use client";

import { ChevronRight, MailQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge/Badge";

type StrangerInboxItemProps = {
  unreadCount: number;
  onClick: () => void;
};

/** Mục tổng hợp ở đầu danh sách: gom hội thoại người lạ, bấm để mở overlay riêng. */
export function StrangerInboxItem({ unreadCount, onClick }: StrangerInboxItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
        <MailQuestion className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-foreground">
          Tin nhắn của người lạ
        </span>
        <span className="block truncate text-[12.5px] text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} cuộc chưa đọc · Nhấn để xem` : "Nhấn để xem"}
        </span>
      </div>
      {unreadCount > 0 && (
        <Badge variant="danger" size="sm">
          {unreadCount}
        </Badge>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
