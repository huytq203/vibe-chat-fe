'use client';

import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { useFriends } from '@/features/friends/hooks/use-query';
import { useAddMembers } from '@/features/chat/hooks/use-mutations';
import { Avatar } from '@/features/chat/components/common/Avatar';

interface AddMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  /** userId đã ở trong nhóm → loại khỏi danh sách chọn. */
  existingMemberIds: string[];
}

export function AddMembersDialog({
  open,
  onOpenChange,
  conversationId,
  existingMemberIds,
}: AddMembersDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: friendsData } = useFriends();
  const addMembers = useAddMembers();

  // State khởi tạo rỗng mỗi lần mount — parent mount theo điều kiện (addOpen)
  // nên không cần reset bằng effect.
  const existing = new Set(existingMemberIds);
  const friends = (friendsData?.items ?? []).filter(({ user }) => !existing.has(user.id));
  const q = search.trim().toLowerCase();
  const filtered = q
    ? friends.filter(({ user }) =>
        (user.displayName?.toLowerCase().includes(q) ?? false) ||
        user.username.toLowerCase().includes(q),
      )
    : friends;

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
            placeholder="Tìm bạn bè..."
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="overflow-y-auto border-t border-border" style={{ height: 280 }}>
          {filtered.map(({ user }) => {
            const checked = selected.has(user.id);
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => toggle(user.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-accent"
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    checked ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <Avatar
                  name={user.displayName ?? user.username}
                  src={user.avatarUrl}
                  size="sm"
                />
                <span className="text-sm">{user.displayName ?? user.username}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {q ? 'Không tìm thấy bạn bè' : 'Tất cả bạn bè đã ở trong nhóm'}
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
