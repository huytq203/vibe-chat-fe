'use client';

import { Check, Clock, Pencil, Reply, Send, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Alert, AlertDescription } from '@/components/ui/alert/Alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { EmojiPicker, prefetchEmojiPicker } from '@/components/common/EmojiPicker';
import { cn } from '@/lib/utils/cn';
import { useMessageComposer } from '@/features/chat/hooks/useMessageComposer';
import { SELF_DESTRUCT_OPTIONS } from '@/features/chat/utils';
import { AttachmentButtons } from './AttachmentButtons';
import { AttachmentTray } from './AttachmentTray';

type MessageInputProps = {
  conversationId: string;
  disabled?: boolean;
};

export function MessageInput({ conversationId, disabled }: MessageInputProps) {
  const {
    editorRef,
    hasContent,
    emojiOpen,
    setEmojiOpen,
    isEditing,
    replying,
    cancelReply,
    selfDestructTtl,
    setSelfDestructTtl,
    attachments,
    addFiles,
    remove,
    isUploading,
    sendError,
    isSavingEdit,
    handleInput,
    handleKey,
    handlePaste,
    submit,
    exitEdit,
    handleEmojiButtonClick,
    handleEmojiSelect,
  } = useMessageComposer(conversationId, disabled);

  return (
    <div className="shrink-0 border-t border-border bg-sidebar px-4 py-3">
      {sendError && (
        <Alert variant="destructive" className="mb-2 py-2 text-[12px]">
          <AlertDescription>Gửi thất bại — {sendError.message}</AlertDescription>
        </Alert>
      )}
      {isEditing && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-l-[3px] border-primary/40 border-l-primary bg-primary/10 px-3 py-2">
          <Pencil className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="flex-1 text-[12.5px] font-semibold text-primary">
            Đang chỉnh sửa tin nhắn
          </span>
          <button
            type="button"
            onClick={exitEdit}
            aria-label="Huỷ chỉnh sửa"
            title="Huỷ (Esc)"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {replying && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-l-[3px] border-primary/40 border-l-primary bg-primary/10 px-3 py-2">
          <Reply className="h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12.5px] font-semibold text-primary">
              Đang trả lời {replying.senderName}
            </span>
            <span className="truncate text-[12px] text-muted-foreground">{replying.snippet}</span>
          </div>
          <button
            type="button"
            onClick={cancelReply}
            aria-label="Huỷ trả lời"
            title="Huỷ trả lời"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {!isEditing && <AttachmentTray attachments={attachments} onRemove={remove} />}
      <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-muted px-2 py-1.5">
        <div className="flex items-center">
          {!isEditing && (
            <>
              <AttachmentButtons onFiles={addFiles} disabled={disabled} />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled}
                      title={
                        selfDestructTtl
                          ? 'Tin nhắn tự huỷ đang bật'
                          : 'Tin nhắn tự huỷ'
                      }
                      aria-label="Tin nhắn tự huỷ"
                      className={cn(
                        selfDestructTtl
                          ? 'text-warning hover:text-warning'
                          : 'text-muted-foreground hover:text-warning',
                      )}
                    >
                      <Clock className="h-[18px] w-[18px]" />
                    </Button>
                  }
                />
                <DropdownMenuContent side="top" align="start" className="min-w-[150px]">
                  {SELF_DESTRUCT_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.label}
                      onClick={() => setSelfDestructTtl(opt.seconds)}
                      className={cn(
                        'justify-between',
                        selfDestructTtl === opt.seconds && 'text-warning',
                      )}
                    >
                      {opt.label}
                      {selfDestructTtl === opt.seconds && <Check className="h-3.5 w-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Emoji"
                aria-label="Emoji"
                className="text-muted-foreground hover:text-primary"
                onMouseEnter={prefetchEmojiPicker}
                onFocus={prefetchEmojiPicker}
                onClick={handleEmojiButtonClick}
              >
                <Smile className="h-[18px] w-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" sideOffset={8} showArrow={false} className="w-auto p-0">
              <EmojiPicker onSelect={handleEmojiSelect} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Contenteditable editor with absolute placeholder */}
        <div className="relative min-h-[32px] max-h-32 flex-1 overflow-y-auto">
          {!hasContent && (
            <span className="pointer-events-none absolute left-1.5 top-[5px] select-none text-[13.5px] text-muted-foreground">
              {isEditing ? 'Chỉnh sửa tin nhắn (Enter để lưu, Esc để huỷ)...' : 'Nhập tin nhắn...'}
            </span>
          )}
          <div
            ref={editorRef}
            contentEditable={disabled ? 'false' : 'true'}
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKey}
            onPaste={handlePaste}
            role="textbox"
            aria-multiline="true"
            aria-label="Nhập tin nhắn"
            className={cn(
              'min-h-[32px] max-h-32 overflow-y-auto px-1.5 py-[5px] text-[13.5px] leading-relaxed',
              'whitespace-pre-wrap break-words outline-none ',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          />
        </div>

        {(hasContent || attachments.length > 0) && (
          <Button
            variant="solid"
            size="icon-sm"
            onClick={() => void submit()}
            isLoading={isEditing ? isSavingEdit : isUploading}
            disabled={disabled}
            aria-label={isEditing ? 'Lưu chỉnh sửa' : 'Gửi'}
            title={isEditing ? 'Lưu (Enter)' : 'Gửi'}
            className="shrink-0"
          >
            {isEditing
              ? !isSavingEdit && <Check className="h-[18px] w-[18px]" />
              : !isUploading && <Send className="h-[18px] w-[18px]" />}
          </Button>
        )}
      </div>
    </div>
  );
}
