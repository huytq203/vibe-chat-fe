'use client';

import { useRef } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import type { AiAttachment } from '@/lib/gemini';
import { AiAttachmentTray } from './AiAttachmentTray';

interface AiChatInputProps {
  input: string;
  loading: boolean;
  attachments: AiAttachment[];
  attachmentError: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
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

export function AiChatInput({
  input,
  loading,
  attachments,
  attachmentError,
  textareaRef,
  disabled = false,
  onInputChange,
  onResize,
  onKeyDown,
  onSend,
  onAddFiles,
  onRemoveAttachment,
}: AiChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = (!input.trim() && attachments.length === 0) || disabled;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      void onAddFiles(e.target.files);
      e.target.value = '';
    }
  }

  return (
    <div className="shrink-0 border-t border-border p-3">
      <AiAttachmentTray
        attachments={attachments}
        error={attachmentError}
        onRemove={onRemoveAttachment}
      />
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,text/plain,text/csv,application/json,text/markdown"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          type="button"
          aria-label="Đính kèm file"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          variant="filled"
          rows={1}
          className="min-h-[2.25rem] max-h-[6rem] resize-none overflow-y-auto py-2 text-[13px]"
          placeholder="Nhắn tin với AI..."
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
          disabled={isDisabled || loading}
          className="h-9 w-9 shrink-0"
          aria-label="Gửi"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
