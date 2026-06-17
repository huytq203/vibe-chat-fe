"use client";

import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";

type GroupManageActionsProps = {
  pendingCount: number;
  onAddMember: () => void;
  onShowRequests: () => void;
};

/** Khối hành động quản lý nhóm (chỉ hiện cho người có quyền): thêm thành viên + yêu cầu vào nhóm. */
export function GroupManageActions({ pendingCount, onAddMember, onShowRequests }: GroupManageActionsProps) {
  return (
    <div className="pb-2 border-b">
      <Button
        onClick={onAddMember}
        className="mb-3 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium">
        Thêm thành viên
      </Button>

      <button
        type="button"
        onClick={onShowRequests}
        className="mb-1 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium hover:bg-muted cursor-pointer border border-border">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
          <UserCheck className="h-[18px] w-[18px]" />
        </span>
        <span className="flex-1">Yêu cầu vào nhóm</span>
        {pendingCount > 0 && (
          <Badge variant="danger" size="sm">
            {pendingCount}
          </Badge>
        )}
      </button>
    </div>
  );
}
