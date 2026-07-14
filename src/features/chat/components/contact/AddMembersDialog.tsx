'use client';

import { useState } from 'react';
import { Bot as BotIcon, Check, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { useFriends } from '@/features/friends/hooks/use-query';
import { useBots } from '@/features/bots';
import { useAddMembers } from '@/features/chat/hooks/use-mutations';
import { Avatar } from '@/features/chat/components/common/Avatar';

interface AddMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  /** userId đã ở trong nhóm → loại khỏi danh sách chọn. */
  existingMemberIds: string[];
}

type MemberCandidate = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isBot: boolean;
};

export function AddMembersDialog({
  open,
  onOpenChange,
  conversationId,
  existingMemberIds,
}: AddMembersDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: friendsData } = useFriends();
  const { data: botsData } = useBots({ page: 1, limit: 50 });
  const addMembers = useAddMembers();

  // State khởi tạo rỗng mỗi lần mount — parent mount theo điều kiện (addOpen)
  // nên không cần reset bằng effect.
  const existing = new Set(existingMemberIds);
  const friendCandidates: MemberCandidate[] = (friendsData?.items ?? []).map(({ user }) => ({
    id: user.id,
    name: user.displayName ?? user.username,
    avatarUrl: user.avatarUrl,
    isBot: false,
  }));
  const botCandidates: MemberCandidate[] = (botsData?.items ?? [])
    .filter((bot) => bot.status === 'ACTIVE' && bot.provisioned && bot.botKeycloakId)
    .map((bot) => ({
      id: bot.botKeycloakId!,
      name: bot.displayName || bot.username,
      avatarUrl: null,
      isBot: true,
    }));
  const candidates = [...friendCandidates, ...botCandidates].filter((c) => !existing.has(c.id));
  const q = search.trim().toLowerCase();
  const filtered = q ? candidates.filter((c) => c.name.toLowerCase().includes(q)) : candidates;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAdd = () => {
    if (selected.size === 0) return;
    addMembers.mutate(
      { conversationId, userIds: [...selected] },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <DialogTitle className="sr-only">Thêm thành viên</DialogTitle>

        <div className="px-4 pb-2 pt-4">
          <h2 className="text-base font-bold">Thêm thành viên</h2>
        </div>

        <div className="px-4 pb-3">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Tìm bạn bè hoặc bot..."
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="overflow-y-auto border-t border-border" style={{ height: 280 }}>
          {filtered.map((c) => {
            const checked = selected.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-accent"
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    checked ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <Avatar name={c.name} src={c.avatarUrl} size="sm" />
                <span className="text-sm">{c.name}</span>
                {c.isBot && (
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                    <BotIcon className="h-3 w-3" />
                    Bot
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {q ? 'Không tìm thấy kết quả' : 'Không có ai để thêm'}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={addMembers.isPending}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            variant="solid"
            onClick={handleAdd}
            isLoading={addMembers.isPending}
            disabled={selected.size === 0}
          >
            Thêm{selected.size > 0 ? ` (${selected.size})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
