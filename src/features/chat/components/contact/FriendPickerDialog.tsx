'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useFriends } from '@/features/friends/hooks/use-query';
import { useGroupsInfinite } from '@/features/chat/hooks/use-query';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';
import type { ShareContactTarget } from '@/features/chat/types';

type TabId = 'friends' | 'groups';

type FriendPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (targets: ShareContactTarget[]) => void;
  /** Tiêu đề dialog — mặc định cho luồng gửi danh thiếp; đổi được cho forward. */
  title?: string;
  /** Nhãn nút gửi (mặc định "Gửi"). */
  actionLabel?: string;
};

const hint = 'py-8 text-center text-[13px] text-muted-foreground';

export function FriendPickerDialog({
  open,
  onOpenChange,
  onPick,
  title = 'Gửi danh thiếp tới',
  actionLabel = 'Gửi',
}: FriendPickerDialogProps) {
  const [tab, setTab] = useState<TabId>('friends');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: friendsData, isLoading: friendsLoading, isError: friendsError } = useFriends();
  const { data: groupPages, isLoading: groupsLoading, isError: groupsError } = useGroupsInfinite();

  const groups = useMemo(
    () => groupPages?.pages.flatMap((p) => p.filter((c) => c.type === 'GROUP')) ?? [],
    [groupPages],
  );

  const filteredFriends = useMemo(() => {
    const items = friendsData?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(({ user }) =>
      (user.displayName ?? '').toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q),
    );
  }, [friendsData, search]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => (g.name ?? '').toLowerCase().includes(q));
  }, [groups, search]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSend() {
    if (selected.size === 0) return;
    const targets: ShareContactTarget[] = [];
    for (const key of selected) {
      if (key.startsWith('f:')) targets.push({ type: 'friend', userId: key.slice(2) });
      else if (key.startsWith('g:')) targets.push({ type: 'group', conversationId: key.slice(2) });
    }
    onPick(targets);
    onOpenChange(false);
    reset();
  }

  function reset() {
    setSearch('');
    setSelected(new Set());
    setTab('friends');
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'friends', label: 'Bạn bè' },
    { id: 'groups', label: 'Nhóm' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm..."
          className='mt-1'
        />

        <div className="flex border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 pb-2 pt-1 text-[13px] font-medium transition-colors',
                tab === t.id
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[280px] overflow-y-auto">
          {tab === 'friends' ? (
            <PickList
              isLoading={friendsLoading}
              isError={friendsError}
              emptyText={search ? 'Không tìm thấy bạn bè phù hợp.' : 'Bạn chưa có bạn bè nào.'}
              items={filteredFriends.map((f) => ({
                key: `f:${f.user.id}`,
                name: f.user.displayName ?? f.user.username,
                sub: `@${f.user.username}`,
                avatarUrl: f.user.avatarUrl,
                type: 'user' as const,
              }))}
              selected={selected}
              onToggle={toggle}
            />
          ) : (
            <PickList
              isLoading={groupsLoading}
              isError={groupsError}
              emptyText={search ? 'Không tìm thấy nhóm phù hợp.' : 'Bạn chưa tham gia nhóm nào.'}
              items={filteredGroups.map((g) => ({
                key: `g:${g.id}`,
                name: g.name ?? 'Nhóm không tên',
                sub: `${g.memberCount} thành viên`,
                avatarUrl: g.avatarUrl,
                type: 'group' as const,
              }))}
              selected={selected}
              onToggle={toggle}
            />
          )}
        </div>

        {selected.size > 0 && (
          <div className="border-t border-border pt-3">
            <Button size="sm" className="w-full" onClick={handleSend}>
              {actionLabel} ({selected.size})
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type PickItem = { key: string; name: string; sub: string; avatarUrl?: string | null; type: 'user' | 'group' };

type PickListProps = {
  isLoading: boolean;
  isError: boolean;
  emptyText: string;
  items: PickItem[];
  selected: Set<string>;
  onToggle: (key: string) => void;
};

function PickList({ isLoading, isError, emptyText, items, selected, onToggle }: PickListProps) {
  if (isLoading) {
    return (
      <ul className="flex flex-col gap-1 py-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex items-center gap-2.5 px-2 py-2">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (isError) return <p className={hint}>Không tải được dữ liệu. Thử lại sau.</p>;
  if (items.length === 0) return <p className={hint}>{emptyText}</p>;

  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.key}>
          {/* div thay button để tránh nested <button> với Checkbox.Root */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onToggle(item.key)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle(item.key)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Avatar name={item.name} src={item.avatarUrl} type={item.type} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{item.name}</p>
              <p className="truncate text-[11.5px] text-muted-foreground">{item.sub}</p>
            </div>
            <span onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={selected.has(item.key)} size="sm" onCheckedChange={() => onToggle(item.key)} />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
