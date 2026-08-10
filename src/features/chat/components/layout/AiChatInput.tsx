'use client';

import { useRef } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { cn } from '@/lib/utils/cn';
import type { AiAttachment } from '@/lib/gemini';
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
  onAddFiles,
  onRemoveAttachment,
}: AiChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPage = variant === 'page';
  const cannotSend = (!input.trim() && attachments.length === 0) || disabled;

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
          ? 'rounded-2xl border bg-sidebar/90 px-2.5 py-2 shadow-subtle backdrop-blur-md'
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
          onClick={onSend}
          disabled={cannotSend || loading}
          className="h-9 w-9 shrink-0"
          aria-label="Gửi"
          title="Gửi (Enter)"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {isPage && (
        <p className="px-1 pt-1 text-right text-[10.5px] text-muted-foreground">
          Enter để gửi · Shift + Enter để xuống dòng
        </p>
      )}
    </div>
  );

  if (!isPage) return <div className="shrink-0">{composer}</div>;

  return (
    <div className="shrink-0 px-1">
      <div className="mx-auto w-full max-w-[680px]">{composer}</div>
    </div>
  );
}
