'use client';

import { useMemo } from 'react';
import { ArrowLeft, Crown, ShieldOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import type { Conversation, ConversationMember } from '@/features/chat/types';
import { getMyRole, isAdminRole } from '@/features/chat/utils';
import { useSetMemberRole } from '@/features/chat/hooks/use-mutations';
import { Avatar } from '@/features/chat/components/common/Avatar';

type AdminsPanelProps = {
  conversation: Conversation;
  meId: string | null;
  onBack: () => void;
  onClose: () => void;
};

/**
 * Danh sách quản trị viên (trưởng nhóm + phó nhóm), lọc từ members[] (xem 28).
 * OWNER có thể gỡ quyền phó nhóm trực tiếp tại đây.
 */
export function AdminsPanel({ conversation, meId, onBack, onClose }: AdminsPanelProps) {
  const setRoleMut = useSetMemberRole();
  const isOwner = getMyRole(conversation, meId) === 'OWNER';

  // OWNER đứng đầu, sau đó tới phó nhóm.
  const admins = useMemo(
    () =>
      (conversation.members ?? [])
        .filter((m) => isAdminRole(m.role))
        .sort((a, b) => (a.role === 'OWNER' ? 0 : 1) - (b.role === 'OWNER' ? 0 : 1)),
    [conversation.members],
  );

  function handleRevoke(m: ConversationMember) {
    setRoleMut.mutate({ conversationId: conversation.id, userId: m.userId, role: 'MEMBER' });
  }

  return (
    <aside className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 pb-3 pt-[18px]">
        <Button variant="ghost" size="icon-sm" onClick={onBack} title="Quay lại" aria-label="Quay lại">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-sm font-bold">Quản trị viên ({admins.length})</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} title="Đóng" aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {admins.length === 0 ? (
          <p className="px-3 py-10 text-center text-xs text-muted-foreground">Chưa tải được danh sách</p>
        ) : (
          admins.map((m) => {
            const label = m.nickname || m.displayName || m.username;
            const owner = m.role === 'OWNER';
            const pending = setRoleMut.isPending && setRoleMut.variables?.userId === m.userId;
            return (
              <div key={m.userId} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted">
                <Avatar name={label} src={m.avatarUrl} size="md" status={null} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-semibold text-foreground">{label}</span>
                    {m.userId === meId && <span className="text-[11px] text-muted-foreground">(Bạn)</span>}
                  </div>
                  <Badge variant={owner ? 'default' : 'secondary'} size="sm" className="mt-0.5">
                    {owner && <Crown className="mr-1 h-3 w-3" />}
                    {owner ? 'Trưởng nhóm' : 'Phó nhóm'}
                  </Badge>
                </div>
                {isOwner && !owner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    isLoading={pending}
                    disabled={setRoleMut.isPending}
                    onClick={() => handleRevoke(m)}
                  >
                    <ShieldOff className="h-4 w-4" />
                    Gỡ quyền
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
