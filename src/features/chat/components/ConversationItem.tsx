'use client';

import { Badge } from '@/components/ui/badge/Badge';
import { EmojiText } from '@/components/common/EmojiText';
import { cn } from '@/lib/utils/cn';
import type { Conversation } from '../types';
import { formatListTime, getConversationName, getConversationSeed } from '../utils';
import { Avatar } from './Avatar';

type ConversationItemProps = {
  conversation: Conversation;
  selected: boolean;
  meId: string | null;
  onSelect: (id: string) => void;
};

export function ConversationItem({ conversation, selected, meId, onSelect }: ConversationItemProps) {
  const name = getConversationName(conversation, meId);
  const seed = getConversationSeed(conversation, meId);
  const preview = conversation.lastMessage?.preview
    ?? (conversation.encryptionType === 'E2E' ? '🔒 Tin nhắn mã hoá' : 'Chưa có tin nhắn');
  const time = formatListTime(conversation.lastMessageAt);
  const unread = conversation.unreadCount;
  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-colors',
        selected
          ? 'bg-primary/10 border-l-2 border-primary pl-1.5'
          : 'hover:bg-muted',
      )}
    >
      <Avatar name={name} seed={seed} size="md" status={null} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-[13.5px] font-semibold text-foreground">{name}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{time}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
              <EmojiText text={preview} />
            </span>
          {unread > 0 && (
            <Badge variant="default" size="sm">
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
