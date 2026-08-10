'use client';

import { useEffect, useState } from 'react';
import { Bot, Check, Copy, File, FileJson, FileText, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { AiAttachmentMeta, AiMessage } from '@/features/chat/hooks/useAiSessions';
import { AiMessageContent } from './AiMessageContent';

/** `window` = cửa sổ AI nổi 360px (bubble 2 phía). `page` = trang /ai (cột đọc rộng). */
export type AiMessageVariant = 'window' | 'page';

function AttachmentDisplay({ attachment }: { attachment: AiAttachmentMeta }) {
  if (attachment.mimeType.startsWith('image/')) {
    if (attachment.previewUrl) {
      return (
        // previewUrl là blob URL — next/image không hỗ trợ blob scheme
        // eslint-disable-next-line @next/next/no-img-element
        <img src={attachment.previewUrl} alt={attachment.name} className="max-w-[200px] rounded-lg" />
      );
    }
    return <span className="text-[11px] opacity-70">[Ảnh] {attachment.name}</span>;
  }

  const Icon =
    attachment.mimeType === 'application/json'
      ? FileJson
      : attachment.mimeType.startsWith('text/')
        ? FileText
        : File;

  return (
    <span className="flex w-fit items-center gap-1.5 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-2 py-0.5 text-[11px]">
      <Icon className="h-3 w-3" />
      <span className="max-w-[140px] truncate">{attachment.name}</span>
    </span>
  );
}

interface AiMessageActionsProps {
  content: string;
  onRegenerate?: () => void;
}

function AiMessageActions({ content, onRegenerate }: AiMessageActionsProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const actionClass =
    'flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="mt-2 flex items-center gap-0.5">
      <button type="button" onClick={() => void handleCopy()} className={actionClass}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Đã sao chép' : 'Sao chép'}
      </button>
      {onRegenerate && (
        <button type="button" onClick={onRegenerate} className={actionClass}>
          <RotateCcw className="h-3.5 w-3.5" />
          Trả lời lại
        </button>
      )}
    </div>
  );
}

function UserContent({ message }: { message: AiMessage }) {
  return (
    <div className="flex flex-col gap-1.5">
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-col gap-1">
          {message.attachments.map((attachment, index) => (
            <AttachmentDisplay key={`${attachment.name}-${index}`} attachment={attachment} />
          ))}
        </div>
      )}
      {message.content && <span className="whitespace-pre-wrap break-words">{message.content}</span>}
    </div>
  );
}

interface AiMessageRowProps {
  message: AiMessage;
  groupedWithPrev: boolean;
  groupedWithNext: boolean;
  variant: AiMessageVariant;
  onRegenerate?: () => void;
}

export function AiMessageRow({
  message,
  groupedWithPrev,
  groupedWithNext,
  variant,
  onRegenerate,
}: AiMessageRowProps) {
  const isUser = message.role === 'user';

  if (variant === 'page') {
    if (isUser) {
      return (
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[13.5px] leading-relaxed text-primary-foreground shadow-subtle">
            <UserContent message={message} />
          </div>
        </div>
      );
    }

    return (
      <div>
        {!groupedWithPrev && (
          <div className="mb-1.5 flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-subtle">
              <Bot className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11.5px] font-semibold text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.55)]">
              Halo AI
            </p>
          </div>
        )}
        <div className="min-w-0 pl-9">
          <div className="rounded-2xl rounded-tl-md border bg-sidebar/85 px-4 pb-2 pt-3 text-foreground shadow-subtle backdrop-blur-md">
            <AiMessageContent content={message.content} className="text-[14.5px] leading-[1.65]" />
            <AiMessageActions content={message.content} onRegenerate={onRegenerate} />
          </div>
        </div>
      </div>
    );
  }

  const groupedRadius = isUser
    ? cn(groupedWithPrev && 'rounded-tr-sm', groupedWithNext && 'rounded-br-sm')
    : cn(groupedWithPrev && 'rounded-tl-sm', groupedWithNext && 'rounded-bl-sm');

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
          groupedRadius,
          isUser ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground',
        )}
      >
        {isUser ? <UserContent message={message} /> : <AiMessageContent content={message.content} />}
      </div>
    </div>
  );
}
