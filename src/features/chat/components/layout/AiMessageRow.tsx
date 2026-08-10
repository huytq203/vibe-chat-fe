'use client';

import { Bot, File, FileJson, FileText } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { AiAttachmentMeta, AiMessage } from '@/features/chat/hooks/useAiSessions';
import { AiMessageContent } from './AiMessageContent';
import {
  AiAssistantActions,
  AiCopyButton,
  AiFailedActions,
  AiIncompleteActions,
} from './AiMessageActions';

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

/** Avatar + tên AI đứng trên thẻ trả lời ở trang /ai. Dùng lại cho chỉ báo đang soạn. */
export function AiAuthorLabel() {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-subtle">
        <Bot className="h-3.5 w-3.5" />
      </span>
      <p className="text-[11.5px] font-semibold text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.55)]">
        Halo AI
      </p>
    </div>
  );
}

interface AiMessageRowProps {
  message: AiMessage;
  index: number;
  groupedWithPrev: boolean;
  groupedWithNext: boolean;
  variant: AiMessageVariant;
  /** Đang chờ AI trả lời — khoá nút "Gửi lại" để không bắn hai lượt chồng nhau. */
  busy: boolean;
  onRegenerate?: () => void;
  onResend: (index: number) => void;
  onEdit: (index: number) => void;
  onDiscard: (index: number) => void;
}

function UserRow({
  message,
  index,
  groupedWithPrev,
  groupedWithNext,
  variant,
  busy,
  onResend,
  onEdit,
  onDiscard,
}: Omit<AiMessageRowProps, 'onRegenerate'>) {
  const isPage = variant === 'page';
  const isFailed = message.status === 'failed';

  return (
    <div className="group flex flex-col items-end">
      <div className="flex w-full items-end justify-end gap-1">
        <AiCopyButton content={message.content} />
        <div
          className={cn(
            'rounded-2xl bg-primary text-primary-foreground',
            isPage
              ? 'max-w-[80%] rounded-br-md px-4 py-2.5 text-[13.5px] leading-relaxed shadow-subtle'
              : 'max-w-[75%] px-3 py-2 text-[13px] leading-relaxed',
            !isPage && groupedWithPrev && 'rounded-tr-sm',
            !isPage && groupedWithNext && 'rounded-br-sm',
            isFailed && 'ring-1 ring-danger/50',
          )}
        >
          <UserContent message={message} />
        </div>
      </div>

      {isFailed && (
        <AiFailedActions
          reason={message.errorMessage}
          pending={busy}
          canEdit={!message.attachments?.length}
          onResend={() => onResend(index)}
          onEdit={() => onEdit(index)}
          onDiscard={() => onDiscard(index)}
        />
      )}
    </div>
  );
}

export function AiMessageRow(props: AiMessageRowProps) {
  const { message, index, groupedWithPrev, groupedWithNext, variant, onRegenerate, onDiscard } =
    props;

  if (message.role === 'user') return <UserRow {...props} />;

  const isIncomplete = message.status === 'incomplete';
  const incompleteActions = (
    <AiIncompleteActions
      content={message.content}
      reason={message.errorMessage}
      onRegenerate={onRegenerate}
      onDiscard={() => onDiscard(index)}
    />
  );

  if (variant === 'page') {
    return (
      <div>
        {!groupedWithPrev && <AiAuthorLabel />}
        <div className="min-w-0 pl-9">
          <div
            className={cn(
              'rounded-2xl rounded-tl-md border bg-sidebar/85 px-4 pb-2 pt-3 text-foreground shadow-subtle backdrop-blur-md',
              isIncomplete && 'border-danger/35',
            )}
          >
            <AiMessageContent content={message.content} className="text-[14.5px] leading-[1.65]" />
            {isIncomplete ? (
              incompleteActions
            ) : (
              <AiAssistantActions content={message.content} onRegenerate={onRegenerate} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-end justify-start gap-1">
      <div
        className={cn(
          'max-w-[75%] rounded-2xl bg-accent px-3 py-2 text-[13px] leading-relaxed text-foreground',
          groupedWithPrev && 'rounded-tl-sm',
          groupedWithNext && 'rounded-bl-sm',
          isIncomplete && 'ring-1 ring-danger/40',
        )}
      >
        <AiMessageContent content={message.content} />
        {isIncomplete && incompleteActions}
      </div>
      {!isIncomplete && <AiCopyButton content={message.content} />}
    </div>
  );
}
