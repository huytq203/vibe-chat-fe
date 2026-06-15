'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import { Check, Clock, Maximize2, Mic, Minimize2, Pencil, Reply, Send, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
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
import { useVoiceMessage } from '@/features/chat/hooks/useVoiceMessage';
import { SELF_DESTRUCT_OPTIONS } from '@/features/chat/utils';
import { AttachmentButtons } from './AttachmentButtons';
import { AttachmentTray } from './AttachmentTray';
import { VoiceRecorderBar } from './VoiceRecorderBar';
import { MentionSuggestPopup } from './MentionSuggestPopup';
import { RichMessageEditor } from './RichMessageEditor';
import { MessageToolbar } from './MessageToolbar';

type MessageInputProps = {
  conversationId: string;
  disabled?: boolean;
};

export function MessageInput({ conversationId, disabled }: MessageInputProps) {
  const {
    editorRef,
    mention,
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
    isSavingEdit,
    handleUpdate,
    handlePasteFiles,
    submit,
    exitEdit,
    handleEmojiButtonClick,
    handleEmojiSelect,
  } = useMessageComposer(conversationId, disabled);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { recorder, sending, stopAndSend } = useVoiceMessage(conversationId);

  // Lỗi micro (chặn quyền / không có thiết bị) → báo cho người dùng.
  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error]);

  return (
    <div className="shrink-0 border-t border-border bg-sidebar px-4 py-3">
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
      <MentionSuggestPopup mention={mention.popup} />
      {!isEditing && <AttachmentTray attachments={attachments} onRemove={remove} />}
      <div className="rounded-2xl border border-border bg-muted px-2 py-1.5">
        {recorder.isRecording || sending ? (
          <VoiceRecorderBar
            elapsedMs={recorder.elapsedMs}
            sending={sending}
            onCancel={recorder.cancel}
            onSend={() => void stopAndSend()}
          />
        ) : (
        <>
        <MessageToolbar editor={editor} disabled={disabled} />
        <div className="flex items-end gap-1.5">
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
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            title={expanded ? 'Thu gọn' : 'Mở rộng vùng soạn'}
            aria-label={expanded ? 'Thu gọn vùng soạn' : 'Mở rộng vùng soạn'}
            aria-pressed={expanded}
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              expanded ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-primary',
            )}
          >
            {expanded ? (
              <Minimize2 className="h-[18px] w-[18px]" />
            ) : (
              <Maximize2 className="h-[18px] w-[18px]" />
            )}
          </Button>
        </div>

        <RichMessageEditor
          ref={editorRef}
          placeholder={
            isEditing ? 'Chỉnh sửa tin nhắn (Enter để lưu, Esc để huỷ)...' : 'Nhập tin nhắn...'
          }
          disabled={disabled}
          expanded={expanded}
          mentionSuggestion={mention.suggestion}
          isMentionOpen={mention.isMentionOpen}
          onUpdate={handleUpdate}
          onEnter={() => void submit()}
          onEscape={isEditing ? exitEdit : undefined}
          onPasteFiles={handlePasteFiles}
          onEditor={setEditor}
        />

        {hasContent || attachments.length > 0 ? (
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
        ) : !isEditing && recorder.isSupported ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void recorder.start()}
            disabled={disabled}
            aria-label="Ghi âm tin nhắn thoại"
            title="Ghi âm"
            className="shrink-0 text-muted-foreground hover:text-primary"
          >
            <Mic className="h-[18px] w-[18px]" />
          </Button>
        ) : null}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
