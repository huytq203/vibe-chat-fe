'use client';

import { memo } from 'react';
import { BellOff, Lock, Pin } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { EmojiText } from '@/components/common/EmojiText';
import { cn } from '@/lib/utils/cn';
import type { Conversation } from '@/features/chat/types';
import {
  formatListTime,
  getConversationAvatar,
  getConversationName,
  isGroupConversation,
  mapPreviewText,
} from '@/features/chat/utils';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { ConversationItemMenu } from './ConversationItemMenu';

type ConversationItemProps = {
  conversation: Conversation;
  selected: boolean;
  meId: string | null;
  onSelect: (id: string) => void;
  /** Avatar lỗi (presigned URL hết hạn) → cho phép list refetch lấy URL mới. */
  onAvatarError?: () => void;
  /** Preview đã giải mã (cho tin FE-encrypted). null = chưa giải mã xong/không có. */
  decryptedPreview?: string | null;
};

function ConversationItemImpl({
  conversation,
  selected,
  meId,
  onSelect,
  onAvatarError,
  decryptedPreview,
}: ConversationItemProps) {
  const name = getConversationName(conversation, meId);
  const avatarUrl = getConversationAvatar(conversation, meId);
  const isLocked = Boolean(conversation.isLocked);
  const lm = conversation.lastMessage;
  // Tin FE-encrypted: dùng preview đã giải mã; chờ giải mã xong thì hiện placeholder.
  const decoded = lm?.previewEncrypted
    ? (decryptedPreview ?? '...')
    : lm?.preview;
  const mappedPreview = mapPreviewText(decoded) || null;
  const preview = isLocked
    ? 'Cuộc hội thoại riêng tư'
    : mappedPreview
      ?? (conversation.messageCount > 0
        ? 'Tin nhắn đã thu hồi'
        : 'Chưa có tin nhắn');
  const time = formatListTime(conversation.lastMessageAt);
  const unread = conversation.unreadCount;

  return (
    <div className="group/ci relative">
      <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-colors',
        selected
          ? 'bg-primary/10'
          : 'hover:bg-muted',
      )}
    >
      <Avatar
        name={name}
        src={avatarUrl}
        type={isGroupConversation(conversation) ? 'group' : 'user'}
        size="md"
        status={null}
        onImageError={onAvatarError}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1">
            {conversation.isPinned && (
              <Pin className="h-3 w-3 shrink-0 text-primary" aria-label="Đã ghim" />
            )}
            {isLocked && (
              <Lock className="h-3 w-3 shrink-0 text-primary" aria-label="Đang khoá" />
            )}
            {conversation.isMuted && (
              <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Đã tắt thông báo" />
            )}
            <span className="truncate text-[13.5px] font-semibold text-foreground">{name}</span>
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{time}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            <EmojiText text={preview} />
          </span>
          {unread > 0 && !selected && (
            <Badge variant="default" size="sm">
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </div>
      </div>
      </button>
      {/* Menu "..." nổi góc phải, hiện khi hover dòng (overlay sibling — tránh button lồng button).
          KHÔNG dùng focus-within: sau khi đóng popover base-ui trả focus về trigger → nút sẽ kẹt hiện. */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover/ci:opacity-100">
        <ConversationItemMenu conversation={conversation} meId={meId} />
      </div>
    </div>
  );
}

// memo: ConversationList re-render mỗi ký tự gõ ở ô tìm / mỗi lần unread đổi. Props ổn định
// (onSelect/onAvatarError là useCallback ở parent) → so sánh nông cắt phần lớn re-render thừa.
export const ConversationItem = memo(ConversationItemImpl);
