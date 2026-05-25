'use client';

import { useMemo } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { useFriends } from '@/features/friends';
import type { UserSearchItem } from '@/features/friends';
import { Avatar } from './Avatar';
import { ConversationItem } from './ConversationItem';
import { getConversationName } from '../utils';
import type { Conversation } from '../types';

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  onBack: () => void;
  conversations: Conversation[];
  meId: string | null;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onMessageFriend: (user: UserSearchItem) => void;
};

export function SearchOverlay({
  query,
  onQueryChange,
  onBack,
  conversations,
  meId,
  selectedConversationId,
  onSelectConversation,
  onMessageFriend,
}: Props) {
  const { data: friendsData } = useFriends();
  const friendItems = friendsData?.items ?? [];

  const friendsSample = useMemo<UserSearchItem[]>(() => {
    if (friendItems.length === 0) return [];
    const arr = friendItems.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 16).map((it) => ({
      ...it.user,
      friendship: 'ACCEPTED' as const,
    }));
  }, [friendItems]);

  const trimmedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!trimmedQuery) return conversations;
    return conversations.filter((c) => {
      const name = getConversationName(c, meId).toLowerCase();
      const preview = (c.lastMessage?.preview ?? '').toLowerCase();
      return name.includes(trimmedQuery) || preview.includes(trimmedQuery);
    });
  }, [conversations, trimmedQuery, meId]);

  const handleSelect = (id: string) => {
    onSelectConversation(id);
    onBack();
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-sidebar">
      <div className="flex shrink-0 items-center gap-1 px-2 py-2.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Quay lại"
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          variant="filled"
          icon={<Search className="h-[14px] w-[14px]" />}
          placeholder="Tìm kiếm..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-9 text-[13px]"
          autoFocus
        />
      </div>

      {!trimmedQuery && friendsSample.length > 0 && (
        <div className="shrink-0">
          <p className="px-4 pb-2 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Bạn bè
          </p>
          <div className="flex gap-0.5 overflow-x-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {friendsSample.map((user) => {
              const name = user.displayName || user.username;
              return (
                <button
                  key={user.id}
                  onClick={() => onMessageFriend(user)}
                  className="flex min-w-[60px] flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 transition-colors hover:bg-accent/50 active:bg-accent/70"
                >
                  <Avatar name={name} src={user.avatarUrl} seed={user.id} size="md" />
                  <span className="w-[52px] truncate text-center text-[11px] leading-tight text-foreground">
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mx-3 mb-1 h-px bg-border/60" />
        </div>
      )}

      {!trimmedQuery && (
        <p className="shrink-0 px-4 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Gần đây
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {trimmedQuery && filtered.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Không tìm thấy kết quả
          </p>
        )}
        {filtered.map((c) => (
          <ConversationItem
            key={c.id}
            conversation={c}
            selected={selectedConversationId === c.id}
            meId={meId}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
