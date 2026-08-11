'use client';

import { useRef } from 'react';
import { Paperclip, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { cn } from '@/lib/utils/cn';
import type { AiAttachment } from '@/features/chat/types/ai-attachment';
import type { AiMessageVariant } from './AiMessageRow';
import { AiAttachmentTray } from './AiAttachmentTray';

interface AiChatInputProps {
  input: string;
  loading: boolean;
  attachments: AiAttachment[];
  attachmentError: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  variant?: AiMessageVariant;
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
  onAddFiles: (files: FileList | File[]) => Promise<void>;
  onRemoveAttachment: (id: string) => void;
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
  const cannotSend = (!input.trim() && attachments.length === 0) || disabled;
  const canStop = loading && Boolean(onStop);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      void onAddFiles(e.target.files);
      e.target.value = '';
    }
  }

  const composer = (
    <div
      className={cn(
        isPage
          ? 'border-t bg-sidebar/90 px-2.5 py-2 backdrop-blur-md md:rounded-2xl md:border md:shadow-subtle'
          : 'border-t border-border p-3',
      )}
    >
      <div className={cn(isPage && 'px-1')}>
        <AiAttachmentTray
          attachments={attachments}
          error={attachmentError}
          onRemove={onRemoveAttachment}
        />
      </div>

      <div className="flex items-end gap-2">
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
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
          type="button"
          aria-label="Đính kèm file"
          title="Đính kèm file"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          variant={isPage ? 'default' : 'filled'}
          rows={1}
          className={cn(
            'resize-none overflow-y-auto',
            isPage
              ? 'min-h-9 max-h-40 border-transparent bg-transparent px-1 py-2 text-[13.5px] leading-relaxed focus:border-transparent'
              : 'min-h-10 max-h-24 py-2 text-[13px]',
          )}
          placeholder={isPage ? 'Hỏi Halo AI bất cứ điều gì...' : 'Nhắn tin với AI...'}
          value={input}
          disabled={disabled}
          onChange={(e) => {
            onInputChange(e.target.value);
            onResize();
          }}
          onKeyDown={(e) => onKeyDown(e, onSend, loading || disabled)}
        />
        <Button
          size="icon"
          variant="solid"
          type="button"
          onClick={canStop ? onStop : onSend}
          disabled={canStop ? false : cannotSend || loading}
          className="h-9 w-9 shrink-0"
          aria-label={canStop ? 'Dừng trả lời' : 'Gửi'}
          title={canStop ? 'Dừng trả lời' : 'Gửi (Enter)'}
        >
          {canStop ? <Square className="h-3.5 w-3.5 fill-current" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* Bàn phím ảo không có Shift+Enter → hint chỉ có nghĩa khi gõ bằng bàn phím cứng. */}
      {isPage && (
        <p className="hidden items-center justify-end gap-1.5 px-1 pt-1.5 text-[11px] text-muted-foreground md:flex">
          <kbd className="rounded-md bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium text-foreground/70">
            Enter
          </kbd>
          để gửi
          <span aria-hidden="true">·</span>
          <kbd className="rounded-md bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium text-foreground/70">
            Shift + Enter
          </kbd>
          để xuống dòng
        </p>
      )}
    </div>
  );

  if (!isPage) return <div className="shrink-0">{composer}</div>;

  // Mobile: full-bleed, viền chỉ ở cạnh trên (giống MessageInput bên chat). Khe hở 4px
  // hai bên trước đây để lọt nền wallpaper thành một sọc mỏng, trông như lỗi render.
  return (
    <div className="shrink-0 md:px-1">
      <div className="mx-auto w-full max-w-170">{composer}</div>
    </div>
  );
}
