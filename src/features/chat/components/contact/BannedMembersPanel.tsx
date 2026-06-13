'use client';

import { ArrowLeft, Ban, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useBannedMembers } from '@/features/chat/hooks/use-query';
import { useUnbanMember } from '@/features/chat/hooks/use-mutations';

type BannedMembersPanelProps = {
  conversationId: string;
  onBack: () => void;
  onClose: () => void;
};

/**
 * Danh sách thành viên đang bị chặn (xem 28-group-settings.md §4) + nút bỏ chặn.
 * Xử lý đủ 4 trạng thái: loading / error / empty / data.
 */
export function BannedMembersPanel({ conversationId, onBack, onClose }: BannedMembersPanelProps) {
  const { data: banned, isLoading, isError, refetch } = useBannedMembers(conversationId);
  const unbanMut = useUnbanMember();

  function handleUnban(userId: string) {
    unbanMut.mutate({ conversationId, userId });
  }

  return (
    <aside className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 pb-3 pt-[18px]">
        <Button variant="ghost" size="icon-sm" onClick={onBack} title="Quay lại" aria-label="Quay lại">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-sm font-bold">Danh sách chặn</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} title="Đóng" aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <p className="px-3 py-10 text-center text-xs text-muted-foreground">Đang tải danh sách…</p>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
            <p className="text-xs text-muted-foreground">Không tải được danh sách chặn</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Thử lại
            </Button>
          </div>
        ) : !banned || banned.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-10 text-center text-muted-foreground">
            <Ban className="h-7 w-7 opacity-50" />
            <p className="text-xs">Chưa có thành viên nào bị chặn</p>
          </div>
        ) : (
          banned.map((m) => {
            const label = m.displayName || m.username;
            const pending = unbanMut.isPending && unbanMut.variables?.userId === m.userId;
            return (
              <div key={m.userId} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted">
                <Avatar name={label} src={m.avatarUrl} seed={m.userId} size="md" status={null} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-foreground">{label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">@{m.username}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  isLoading={pending}
                  disabled={unbanMut.isPending}
                  onClick={() => handleUnban(m.userId)}
                >
                  Bỏ chặn
                </Button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
