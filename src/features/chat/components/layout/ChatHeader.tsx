'use client';

import { Archive, ArrowLeft, PanelRight, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { cn } from '@/lib/utils/cn';
import type { Conversation, Presence } from '@/features/chat/types';
import { getConversationAvatar, getConversationName, isGroupConversation } from '@/features/chat/utils';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useMessageJumpStore } from '@/features/chat/stores/message-jump.store';
import { MessageSearchResults } from '@/features/chat/components/contact/MessageSearchResults';
import { CallButtons, buildCallDirectory } from '@/features/call';
import { Separator } from '@/components/ui/separator/Separator';

type ChatHeaderProps = {
  conversation: Conversation;
  meId: string | null;
  presence: Presence | null;
  rightOpen: boolean;
  onToggleRight: () => void;
  /** Mobile only: back button ← về danh sách. */
  onBack?: () => void;
  wallpaperActive?: boolean;
};

export function ChatHeader({ conversation, meId, presence, rightOpen, onToggleRight, onBack, wallpaperActive }: ChatHeaderProps) {
  const [searching, setSearching] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const requestJump = useMessageJumpStore((s) => s.requestJump);

  const isSelfConv = conversation.type === 'SELF';
  const name = isSelfConv ? 'Kho của tôi' : getConversationName(conversation, meId);
  const avatarUrl = isSelfConv ? null : getConversationAvatar(conversation, meId);

  const status: 'online' | 'offline' | null = !presence
    ? null
    : presence.isOnline
      ? 'online'
      : 'offline';

  const statusLabel = isSelfConv
    ? 'Ghi chú · Nhắc nhở · Bookmark'
    : !presence
      ? conversation.type === 'DIRECT' ? '​' : `${conversation.memberCount} thành viên`
      : presence.isOnline
        ? 'Đang hoạt động'
        : presence.lastSeenLabel ?? 'Ngoại tuyến';

  return (
    <div className={cn('flex shrink-0 items-center justify-between border-b border-border px-4 py-3', wallpaperActive ? 'bg-sidebar/75 backdrop-blur-md' : 'bg-sidebar')}>
      {onBack && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label="Quay lại"
          title="Quay lại"
          className="mr-1 shrink-0"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Button>
      )}
      <button
        type="button"
        onClick={onToggleRight}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        {isSelfConv ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/30">
            <Archive className="h-4 w-4" />
          </span>
        ) : (
          <Avatar
            name={name}
            src={avatarUrl}
            type={isGroupConversation(conversation) ? 'group' : 'user'}
            size="md"
            status={status}
          />
        )}
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-bold text-foreground">{name}</div>
          <div className="truncate text-[11.5px] text-foreground">{statusLabel}</div>
        </div>
      </button>

      <div className="flex items-center gap-1">
        {searching ? (
          <div className="relative w-[230px]">
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
            {searchQ.trim().length >= 1 && (
              <div className="absolute right-0 top-full z-50 mt-1 max-h-[60vh] w-[320px] max-w-[85vw] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                <MessageSearchResults
                  conversation={conversation}
                  query={searchQ}
                  onJump={(id, createdAt) => requestJump({ id, createdAt })}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            {!isSelfConv && conversation.type !== 'CHANNEL' && (
              <CallButtons
                conversationId={conversation.id}
                isGroup={conversation.type === 'GROUP'}
                directory={buildCallDirectory(conversation)}
                peer={{
                  id:
                    conversation.type === 'DIRECT'
                      ? conversation.memberIds.find((id) => id !== meId) ?? ''
                      : conversation.id,
                  name,
                  avatarUrl: conversation.avatarUrl,
                }}
              />
            )}
            
          </>
        )}
        {!onBack && (
          <>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleRight}
            title={rightOpen ? 'Ẩn thông tin' : 'Hiện thông tin'}
            aria-label="Toggle panel"
            className={cn(' border-border ', rightOpen && 'text-primary')}
          >
            <PanelRight className="h-[18px] w-[18px]" />
          </Button>
          </>
        )}
      </div>
    </div>
  );
}
