'use client';

import { useState } from 'react';
import { Bot as BotIcon, Camera, Check, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { useFriends } from '@/features/friends/hooks/use-query';
import type { UserSummary } from '@/features/friends/types';
import { useBots } from '@/features/bots';
import { useCreateGroup } from '@/features/chat/hooks/use-mutations';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { ApiError } from '@/lib/api/client';

const MAX_MEMBERS = 100;
const FILTERS = ['Tất cả', 'Khách hàng', 'Gia đình', 'Công việc', 'Bạn bè', 'Trả lời sau'] as const;

interface Preselected {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselected?: Preselected;
}

type GroupCandidate = UserSummary & {
  isBot?: boolean;
};

export function CreateGroupDialog({ open, onOpenChange, preselected }: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: friendsData } = useFriends();
  const { data: botsData } = useBots({ page: 1, limit: 50 });
  const createGroup = useCreateGroup();

  // Reset form mỗi khi dialog mở (pattern React chính thống: chỉnh state khi prop đổi,
  // ngay trong render — tránh ref-in-render + setState-trong-effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setGroupName('');
      setSearch('');
      setActiveFilter('Tất cả');
      setSelected(new Set(preselected ? [preselected.id] : []));
    }
  }

  const friendCandidates: GroupCandidate[] = (friendsData?.items ?? []).map(({ user }) => ({
    ...user,
    isBot: false,
  }));
  const botCandidates: GroupCandidate[] = (botsData?.items ?? [])
    .filter((bot) => bot.status === 'ACTIVE' && bot.provisioned && bot.botKeycloakId)
    .map((bot) => ({
      id: bot.botKeycloakId!,
      username: bot.username,
      email: '',
      phone: null,
      displayName: bot.displayName || bot.username,
      avatarUrl: null,
      isBot: true,
    }));
  const candidates = [...friendCandidates, ...botCandidates];
  const filtered = search.trim()
    ? candidates.filter((user) => {
        const q = search.toLowerCase();
        return (
          user.displayName?.toLowerCase().includes(q) ||
          user.username.toLowerCase().includes(q)
        );
      })
    : candidates;

  const candidateMap = new Map<string, GroupCandidate>(candidates.map((user) => [user.id, user]));

  const getUser = (id: string): GroupCandidate | Preselected | null => {
    if (candidateMap.has(id)) return candidateMap.get(id)!;
    if (preselected?.id === id) return { id, username: preselected.name, displayName: preselected.name, email: '', phone: null, avatarUrl: preselected.avatarUrl ?? null };
    return null;
  };

  const toggle = (user: GroupCandidate) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(user.id)) next.delete(user.id);
      else if (next.size < MAX_MEMBERS) next.add(user.id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!groupName.trim() || selected.size === 0) return;
    createGroup.mutate(
      { name: groupName.trim(), memberIds: [...selected] },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Tạo nhóm thất bại. Vui lòng thử lại.'),
      },
    );
  };

  const getUserLabel = (u: UserSummary | Preselected): string =>
    ('name' in u ? u.name : (u.displayName ?? u.username)) ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Tạo nhóm</DialogTitle>

        <div className="px-4 pb-2 pt-4">
          <h2 className="text-base font-bold">Tạo nhóm</h2>
        </div>

        <div className="flex items-center gap-3 px-4 pb-3">
          <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary">
            <Camera className="h-5 w-5 text-muted-foreground" />
          </button>
          <Input
            variant="flushed"
            placeholder="Nhập tên nhóm..."
            value={groupName}
            onChange={(e) => setGroupName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="px-4 pb-3">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Tìm bạn bè hoặc bot..."
            value={search}
            onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex border-t border-border">
          <div className={`flex flex-col ${selected.size > 0 ? 'flex-1' : 'w-full'}`}>
            <p className="px-4 py-2 text-sm font-semibold">Trò chuyện gần đây</p>
            <div className="overflow-y-auto" style={{ height: 260 }}>
              {filtered.map((user) => {
                const checked = selected.has(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggle(user)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-accent"
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${checked ? 'border-primary bg-primary' : 'border-border'}`}>
                      {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <Avatar name={user.displayName ?? user.username} src={user.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm">{user.displayName ?? user.username}</span>
                    {user.isBot && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                        <BotIcon className="h-3 w-3" />
                        Bot
                      </span>
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Không có kết quả</p>
              )}
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex w-[240px] shrink-0 flex-col border-l border-border">
              <p className="px-4 py-2 text-sm font-semibold">
                Đã chọn <span className="text-primary">{selected.size}/{MAX_MEMBERS}</span>
              </p>
              <div className="overflow-y-auto" style={{ height: 260 }}>
                {[...selected].map((id) => {
                  const u = getUser(id);
                  if (!u) return null;
                  const label = getUserLabel(u);
                  return (
                    <div key={id} className="flex items-center gap-2.5 px-4 py-2">
                      <Avatar name={label} src={u.avatarUrl} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                      <button
                        type="button"
                        onClick={() => setSelected((p) => { const n = new Set(p); n.delete(id); return n; })}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted hover:bg-secondary"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={createGroup.isPending}>
            Huỷ
          </Button>
          <Button
            type="button"
            variant="solid"
            onClick={handleCreate}
            isLoading={createGroup.isPending}
            disabled={!groupName.trim() || selected.size === 0}
          >
            Tạo nhóm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
