'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import { Check, Mic, Pencil, Reply, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useMessageComposer } from '@/features/chat/hooks/useMessageComposer';
import { useVoiceMessage } from '@/features/chat/hooks/useVoiceMessage';
import { AttachmentTray } from './attachment/AttachmentTray';
import { VoiceRecorderBar } from './VoiceRecorderBar';
import { MentionSuggestPopup } from './MentionSuggestPopup';
import { RichMessageEditor } from './RichMessageEditor';
import { MessageToolbar } from './MessageToolbar';
import { ComposerActions } from './ComposerActions';
import { ScheduleMessageDialog } from './ScheduleMessageDialog';
import { ContactPickerDialog } from '@/features/chat/components/contact/ContactPickerDialog';
import { useShareContact } from '@/features/chat/hooks/useShareContact';
import { Bell, CheckSquare, Bookmark } from 'lucide-react';
import { ReminderDialog } from '@/features/my-store/components/ReminderDialog';
import { ChecklistDialog } from '@/features/my-store/components/ChecklistDialog';
import { BookmarkDialog } from '@/features/my-store/components/BookmarkDialog';
import { CreatePollDialog } from '@/features/chat/components/polls/CreatePollDialog';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { cn } from '@/lib/utils/cn';

type MessageInputProps = {
  conversationId: string;
  disabled?: boolean;
  /** Khi true (SELF conv) hiện thêm nút Nhắc nhở / Checklist / Bookmark bên dưới. */
  selfConv?: boolean;
  /** Khi true (GROUP/CHANNEL) hiện nút Bình chọn trong menu. */
  isGroup?: boolean;
  wallpaperActive?: boolean;
};

export function MessageInput({ conversationId, disabled, selfConv, isGroup, wallpaperActive }: MessageInputProps) {
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
    removeAll,
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
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const shareContact = useShareContact(conversationId);
  const { recorder, sending, stopAndSend } = useVoiceMessage(conversationId);
  const setActiveSection = useChatUIStore((s) => s.setActiveSection);

  // Lỗi micro (chặn quyền / không có thiết bị) → báo cho người dùng.
  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error]);

  const actions = (
    <ComposerActions
      disabled={disabled}
      isEditing={isEditing}
      expanded={expanded}
      emojiOpen={emojiOpen}
      selfDestructTtl={selfDestructTtl}
      onFiles={addFiles}
      onSelfDestruct={setSelfDestructTtl}
      onScheduleClick={() => setScheduleOpen(true)}
      onContactClick={() => setContactOpen(true)}
      onEmojiOpenChange={setEmojiOpen}
      onEmojiButtonClick={handleEmojiButtonClick}
      onEmojiSelect={handleEmojiSelect}
      onToggleExpanded={() => setExpanded((v) => !v)}
      onAiClick={() => setActiveSection('ai')}
      onPollClick={isGroup ? () => setPollOpen(true) : undefined}
    />
  );

  const editorEl = (
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
  );

  const sendEl =
    hasContent || attachments.length > 0 ? (
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
    ) : null;

  return (
    <div className={cn('shrink-0 border-t border-border px-4 py-3', wallpaperActive ? 'bg-sidebar/75 backdrop-blur-md' : 'bg-sidebar')}>
      {isEditing && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
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
        <div className="mb-2 flex items-center gap-2 rounded-lg  bg-primary/10 px-3 py-2">
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
      {!isEditing && (
        <AttachmentTray attachments={attachments} onRemove={remove} onRemoveAll={removeAll} />
      )}
      <div className="rounded-2xl border border-border bg-muted px-2 py-1.5">
        {recorder.isRecording || sending ? (
          <VoiceRecorderBar
            elapsedMs={recorder.elapsedMs}
            sending={sending}
            onCancel={recorder.cancel}
            onSend={() => void stopAndSend()}
          />
        ) : expanded ? (
          <>
            <MessageToolbar editor={editor} disabled={disabled} />
            {editorEl}
            <div className="mt-1.5 flex items-center justify-between gap-1.5">
              {actions}
              {sendEl}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-end gap-1.5">
              {actions}
              {editorEl}
              {sendEl}
            </div>
          </>
        )}
      </div>
      <ScheduleMessageDialog
        conversationId={conversationId}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
      />
      <ContactPickerDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        onPick={shareContact}
      />
      {isGroup && (
        <CreatePollDialog
          open={pollOpen}
          onOpenChange={setPollOpen}
          conversationId={conversationId}
        />
      )}
      {selfConv && (
        <>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground mr-1">Tạo:</span>
            <button
              type="button"
              onClick={() => setReminderOpen(true)}
              className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 text-[11.5px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
            >
              <Bell className="h-3 w-3" />
              Nhắc nhở
            </button>
            <button
              type="button"
              onClick={() => setChecklistOpen(true)}
              className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11.5px] font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <CheckSquare className="h-3 w-3" />
              Checklist
            </button>
            <button
              type="button"
              onClick={() => setBookmarkOpen(true)}
              className="flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-50 dark:bg-blue-950/20 px-2.5 py-1 text-[11.5px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
            >
              <Bookmark className="h-3 w-3" />
              Bookmark
            </button>
          </div>
          <ReminderDialog open={reminderOpen} onClose={() => setReminderOpen(false)} />
          <ChecklistDialog open={checklistOpen} onClose={() => setChecklistOpen(false)} />
          <BookmarkDialog open={bookmarkOpen} onClose={() => setBookmarkOpen(false)} />
        </>
      )}
    </div>
  );
}
