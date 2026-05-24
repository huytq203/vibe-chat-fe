'use client';

import { Check, CheckCheck, Clock, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Message } from '../types';
import { formatBubbleTime } from '../utils';
import { Avatar } from './Avatar';

type MessageBubbleProps = {
  message: Message;
  meId: string | null;
  showAvatar: boolean;
  senderName?: string | null;
  senderSeed?: string;
};

export function MessageBubble({
  message, meId, showAvatar, senderName, senderSeed,
}: MessageBubbleProps) {
  const isMe = message.senderId === meId;
  const isE2E = message.encryptionType === 'E2E';
  const isSending = message.metadata?.optimistic === true;
  const isSeen = isMe && !isSending && message.isView === true;

  return (
    <div className={cn('flex items-end gap-1.5', isMe ? 'justify-end' : 'justify-start')}>
      {!isMe && (
        <div className="w-7 shrink-0">
          {showAvatar && (
            <Avatar
              name={senderName ?? null}
              seed={senderSeed ?? message.senderId}
              size="sm"
              className="!h-7 !w-7 !rounded-lg !text-[9px]"
            />
          )}
        </div>
      )}
      <div className="max-w-[65%]">
        <div
          className={cn(
            'relative rounded-2xl px-3.5 py-2.5 transition-opacity',
            isMe
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md border border-border bg-muted text-foreground',
            isSending && 'opacity-70',
          )}
        >
          <BubbleContent message={message} isE2E={isE2E} />
          <div className="mt-1 flex items-center justify-end gap-1">
            <span className={cn('text-[10px]', isMe ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
              {isSending ? 'Đang gửi…' : formatBubbleTime(message.createdAt)}
            </span>
            {isMe && (
              isSending ? (
                <Clock className="h-3.5 w-3.5 opacity-70" aria-label="Đang gửi" />
              ) : isSeen ? (
                <CheckCheck className="h-3.5 w-3.5 text-sky-400" aria-label="Đã xem" />
              ) : (
                <Check className="h-3.5 w-3.5 opacity-80" aria-label="Đã gửi" />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BubbleContent({ message, isE2E }: { message: Message; isE2E: boolean }) {
  if (isE2E) {
    return (
      <div className="flex items-center gap-1.5 text-[13.5px] italic opacity-90">
        <Lock className="h-3.5 w-3.5" />
        <span>Tin nhắn mã hoá — không có khoá để giải mã</span>
      </div>
    );
  }
  if (message.isDeleted) {
    return <span className="text-[13.5px] italic opacity-70">Tin nhắn đã thu hồi</span>;
  }
  if (message.type === 'TEXT') {
    return (
      <span className="block whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">
        {message.plaintext ?? message.contentPreview ?? ''}
      </span>
    );
  }
  return (
    <span className="block text-[13.5px] italic opacity-80">
      [{message.type.toLowerCase()}]
    </span>
  );
}

