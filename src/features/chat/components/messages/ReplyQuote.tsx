'use client';

import { cn } from '@/lib/utils/cn';
import type { Message } from '../../types';
import { getMessageSnippet } from '../../utils';

type ReplyQuoteProps = {
  /** Tin gốc đã tra từ cache; null = ngoài khung nhìn (chưa load). */
  repliedTo: Message | null;
  /** Tên người gửi tin gốc đã resolve ("Bạn" nếu là mình). */
  repliedToName: string | null;
  /** Id tin gốc — luôn có, dùng để cuộn tới kể cả khi repliedTo null. */
  replyToMessageId: string;
  /** true khi bubble chứa quote là tin của mình (đổi màu cho hợp nền). */
  isMe: boolean;
  onClick: (messageId: string) => void;
};

/**
 * Khối trích dẫn tin gốc hiển thị bên trong bubble reply. Bấm → cuộn tới tin gốc.
 * Tin gốc ngoài cache (repliedTo null) → hiện bản tối giản; bấm vẫn báo qua onClick.
 */
export function ReplyQuote({
  repliedTo, repliedToName, replyToMessageId, isMe, onClick,
}: ReplyQuoteProps) {
  const name = repliedTo ? repliedToName ?? 'Người dùng' : null;
  const snippet = repliedTo
    ? getMessageSnippet(repliedTo)
    : 'Tin nhắn gốc không còn trong khung nhìn';

  return (
    <button
      type="button"
      onClick={() => onClick(replyToMessageId)}
      className={cn(
        'mb-1.5 flex w-full flex-col gap-0.5 rounded-md border-l-[3px] px-2 py-1 text-left transition-colors',
        isMe
          ? 'border-primary-foreground/60 bg-primary-foreground/10 hover:bg-primary-foreground/20'
          : 'border-primary/60 bg-primary/10 hover:bg-primary/20',
      )}
    >
      {name && (
        <span
          className={cn(
            'text-[11px] font-semibold leading-none',
            isMe ? 'text-primary-foreground/90' : 'text-primary',
          )}
        >
          {name}
        </span>
      )}
      <span
        className={cn(
          'truncate text-[12px] leading-snug',
          repliedTo
            ? isMe
              ? 'text-primary-foreground/75'
              : 'text-muted-foreground'
            : 'italic opacity-70',
        )}
      >
        {snippet}
      </span>
    </button>
  );
}
