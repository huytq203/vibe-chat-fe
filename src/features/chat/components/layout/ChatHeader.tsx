'use client';

import { MoreVertical, PanelRight, Phone, Search, Video, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { cn } from '@/lib/utils/cn';
import type { Conversation, Presence } from '../../types';
import { getConversationName, getConversationSeed } from '../../utils';
import { Avatar } from '../common/Avatar';

type ChatHeaderProps = {
  conversation: Conversation;
  meId: string | null;
  presence: Presence | null;
  rightOpen: boolean;
  onToggleRight: () => void;
};

export function ChatHeader({ conversation, meId, presence, rightOpen, onToggleRight }: ChatHeaderProps) {
  const [searching, setSearching] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const name = getConversationName(conversation, meId);
  const seed = getConversationSeed(conversation, meId);

  const status: 'online' | 'offline' | null = !presence
    ? null
    : presence.isOnline
      ? 'online'
      : 'offline';

  const statusLabel = !presence
    ? conversation.type === 'DIRECT' ? '​' : `${conversation.memberCount} thành viên`
    : presence.isOnline
      ? 'Đang hoạt động'
      : presence.lastSeenLabel ?? 'Ngoại tuyến';

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border bg-sidebar px-4 py-3">
      <button
        type="button"
        onClick={onToggleRight}
        className="flex min-w-0 items-center gap-2.5 text-left"
      >
        <Avatar name={name} seed={seed} size="md" status={status} />
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-bold text-foreground">{name}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">{statusLabel}</div>
        </div>
      </button>

      <div className="flex items-center gap-1">
        {searching ? (
          <div className="w-[230px]">
            <Input
              autoFocus
              variant="filled"
              icon={<Search className="h-4 w-4" />}
              endIcon={
                <button
                  type="button"
                  onClick={() => { setSearching(false); setSearchQ(''); }}
                  aria-label="Đóng tìm kiếm"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              }
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Tìm tin nhắn..."
              className="h-8 text-[13px]"
            />
          </div>
        ) : (
          <>
            <Button variant="ghost" size="icon-sm" title="Gọi thoại" aria-label="Gọi thoại">
              <Phone className="h-[18px] w-[18px]" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Gọi video" aria-label="Gọi video">
              <Video className="h-[18px] w-[18px]" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Tìm kiếm" aria-label="Tìm kiếm" onClick={() => setSearching(true)}>
              <Search className="h-[18px] w-[18px]" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Thêm" aria-label="Thêm">
              <MoreVertical className="h-[18px] w-[18px]" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleRight}
          title={rightOpen ? 'Ẩn thông tin' : 'Hiện thông tin'}
          aria-label="Toggle panel"
          className={cn('ml-1 border-l border-border pl-2 rounded-l-none', rightOpen && 'text-primary')}
        >
          <PanelRight className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </div>
  );
}
