'use client';

import { useRef } from 'react';
import { ArrowUp, FileText, FolderKanban, Paperclip, Square } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { cn } from '@/lib/utils/cn';
import type { AiAttachment } from '@/features/ai/types';
import type { AiMessageVariant } from './AiMessageRow';
import { AiAttachmentTray } from './AiAttachmentTray';

interface AiChatInputProps {
  input: string;
  loading: boolean;
  attachments?: AiAttachment[];
  attachmentError?: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  variant?: AiMessageVariant | 'panel';
  context?: {
    kind: 'page' | 'project';
    label: string;
  };
  onInputChange: (value: string) => void;
  onResize: () => void;
  onKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    onSend: () => void,
    disabled: boolean,
  ) => void;
  onSend: () => void;
  /** Dừng lượt AI đang chảy. Có handler → nút gửi đổi thành nút dừng khi loading. */
  onStop?: () => void;
  onAddFiles?: (files: FileList | File[]) => Promise<void>;
  onRemoveAttachment?: (id: string) => void;
}

const ACCEPTED_FILES =
  'image/*,application/pdf,text/plain,text/csv,application/json,text/markdown';

export function AiChatInput({
  input,
  loading,
  attachments,
  attachmentError,
  textareaRef,
  disabled = false,
  variant = 'window',
  context,
  onInputChange,
  onResize,
  onKeyDown,
  onSend,
  onStop,
  onAddFiles,
  onRemoveAttachment,
}: AiChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPage = variant === 'page';
  const isPanel = variant === 'panel';
  const attachmentControls =
    attachments && attachmentError !== undefined && onAddFiles && onRemoveAttachment
      ? { attachments, attachmentError, onAddFiles, onRemoveAttachment }
      : null;
  const cannotSend = (!input.trim() && !attachmentControls?.attachments.length) || disabled;
  const canStop = loading && Boolean(onStop);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length && attachmentControls) {
      void attachmentControls.onAddFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!attachmentControls) return;

    const itemFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    const imageFiles = itemFiles.length > 0
      ? itemFiles
      : Array.from(e.clipboardData.files).filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;
    e.preventDefault();
    void attachmentControls.onAddFiles(imageFiles);
  }

  const composer = (
    <div>
      {context?.label.trim() && (
        <div className="flex min-w-0 items-center gap-2 px-1 pb-2 text-xs">
          {context.kind === 'page' ? (
            <FileText className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <FolderKanban className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          )}
          <span className="truncate font-semibold text-foreground/75">{context.label}</span>
        </div>
      )}

      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-border bg-muted/35',
          'transition-colors focus-within:border-primary/55',
          isPage && 'bg-sidebar/95',
        )}
      >
        {attachmentControls && (
          <div className="px-3 pt-2">
            <AiAttachmentTray
              attachments={attachmentControls.attachments}
              error={attachmentControls.attachmentError}
              onRemove={attachmentControls.onRemoveAttachment}
            />
          </div>
        )}

        <Textarea
          ref={textareaRef}
          rows={1}
          className={cn(
            'resize-none overflow-y-auto rounded-none border-0 bg-transparent px-3',
            'focus:border-transparent focus-visible:border-transparent',
            isPage
              ? 'min-h-16 max-h-40 py-3 text-sm leading-relaxed'
              : 'min-h-16 max-h-32 py-3 text-[13px] leading-relaxed',
          )}
          placeholder={isPage ? 'Hỏi Halo AI bất cứ điều gì...' : 'Nhắn tin với AI...'}
          value={input}
          disabled={disabled}
          onChange={(e) => {
            onInputChange(e.target.value);
            onResize();
          }}
          onPaste={handlePaste}
          onKeyDown={(e) => onKeyDown(e, onSend, loading || disabled)}
        />

        <div className="flex min-h-11 items-center justify-between gap-2 px-2 pb-2">
          <div className="flex min-w-0 items-center">
            {attachmentControls && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_FILES}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-9 shrink-0 rounded-xl text-muted-foreground hover:text-primary"
                  type="button"
                  aria-label="Đính kèm file"
                  title="Đính kèm file"
                  disabled={disabled}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-4" />
                </Button>
              </>
            )}
          </div>
          <Button
            size="icon"
            variant="solid"
            type="button"
            onClick={canStop ? onStop : onSend}
            disabled={canStop ? false : cannotSend || loading}
            className="size-9 shrink-0 rounded-full"
            aria-label={canStop ? 'Dừng trả lời' : 'Gửi'}
            title={canStop ? 'Dừng trả lời' : 'Gửi (Enter)'}
          >
            {canStop ? (
              <Square className="size-3.5 fill-current" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isPanel) {
    return (
      <div className="shrink-0 px-3 pb-[max(var(--safe-bottom),0.75rem)] pt-2">
        {composer}
      </div>
    );
  }

  if (!isPage) {
    return <div className="shrink-0 border-t border-border bg-background p-3">{composer}</div>;
  }

  // Mobile: full-bleed, viền chỉ ở cạnh trên (giống MessageInput bên chat). Khe hở 4px
  // hai bên trước đây để lọt nền wallpaper thành một sọc mỏng, trông như lỗi render.
  return (
    <div className="shrink-0 border-t bg-sidebar px-2.5 py-2 max-md:pb-[max(var(--safe-bottom),0.5rem)] md:border-0 md:px-1">
      <div className="mx-auto w-full max-w-170">{composer}</div>
    </div>
  );
}
