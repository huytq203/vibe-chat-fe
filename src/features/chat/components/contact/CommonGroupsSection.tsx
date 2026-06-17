"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { Avatar } from "@/features/chat/components/common/Avatar";
import { useCommonGroups } from "@/features/chat/hooks/use-query";

type CommonGroupsSectionProps = {
  userId: string | null;
  enabled: boolean;
  onOpenGroup: (groupId: string) => void;
};

/** Khối "Nhóm chung" trong modal hồ sơ user — cursor-based, lazy load khi cuộn. */
export function CommonGroupsSection({ userId, enabled, onOpenGroup }: CommonGroupsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const groupsQuery = useCommonGroups(userId, enabled);
  const groups = groupsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  // API cursor-based không trả total → đã hết trang thì là số chính xác, còn trang = "N+".
  const countLabel = groupsQuery.hasNextPage ? `${groups.length}+` : `${groups.length}`;

  if (!enabled) return null;

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (nearBottom && groupsQuery.hasNextPage && !groupsQuery.isFetchingNextPage) {
      void groupsQuery.fetchNextPage();
    }
  }

  return (
    <div className="border-t border-border px-6 pb-6 pt-4">
      {groupsQuery.isLoading ? (
        <Skeleton className="h-9 w-full" />
      ) : groups.length === 0 ? (
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Users className="h-4 w-4" />
          Chưa có nhóm chung
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-bold transition-colors hover:bg-secondary">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">
              Nhóm chung
              <span className="ml-1.5 text-[12px] font-semibold text-muted-foreground">
                {countLabel} nhóm
              </span>
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expanded && (
            <div onScroll={handleScroll} className="mt-2 flex max-h-56 flex-col gap-0.5 overflow-y-auto">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onOpenGroup(g.id)}
                  className="flex shrink-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-secondary">
                  <Avatar name={g.name ?? "Nhóm"} src={g.avatarUrl} seed={g.id} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-foreground">
                      {g.name ?? "Nhóm không tên"}
                    </span>
                    <span className="block text-[12px] text-muted-foreground">
                      {g.memberCount} thành viên
                    </span>
                  </span>
                </button>
              ))}
              {groupsQuery.isFetchingNextPage && (
                <p className="py-1.5 text-center text-[11px] text-muted-foreground">Đang tải thêm...</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
