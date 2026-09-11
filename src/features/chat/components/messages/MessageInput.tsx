"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { Check, Mic, Pencil, Reply, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { useMessageComposer } from "@/features/chat/hooks/useMessageComposer";
import { useInlineMode } from "@/features/chat/hooks/useInlineMode";
import { useVoiceMessage } from "@/features/chat/hooks/useVoiceMessage";
import type {
  ConversationType,
  InlineBotSummary,
  InlineResult,
} from "@/features/chat/types";
import { AttachmentTray } from "./attachment/AttachmentTray";
import { VoiceRecorderBar } from "./VoiceRecorderBar";
import { MentionSuggestPopup } from "./MentionSuggestPopup";
import { InlineModePopup } from "./InlineModePopup";
import { RichMessageEditor } from "./RichMessageEditor";
import { PlainMessageEditor } from "./PlainMessageEditor";
import { MessageToolbar } from "./MessageToolbar";
import { ComposerActions } from "./ComposerActions";
import { ScheduleMessageDialog } from "./ScheduleMessageDialog";
import { BotFatherCommandSuggestPopup } from "./BotFatherCommandSuggestPopup";
import {
  matchBotFatherCommands,
  type BotFatherCommand,
} from "./botfather-commands";
import { ContactPickerDialog } from "@/features/chat/components/contact/ContactPickerDialog";
import { useShareContact } from "@/features/chat/hooks/useShareContact";
import { Bell, CheckSquare, Bookmark } from "lucide-react";
import { ReminderDialog } from "@/features/my-store/components/ReminderDialog";
import { ChecklistDialog } from "@/features/my-store/components/ChecklistDialog";
import { BookmarkDialog } from "@/features/my-store/components/BookmarkDialog";
import { CreatePollDialog } from "@/features/chat/components/polls/CreatePollDialog";
import { useAiWindowStore } from "@/features/chat/stores/ai-window.store";
import { useMessageDraftCommandStore } from "@/features/chat/stores/message-draft-command.store";
import { cn } from "@/lib/utils/cn";
import type { SerializedMessage } from "@/lib/editor/serializer";

type MessageInputProps = {
  conversationId: string;
  conversationType: ConversationType;
  disabled?: boolean;
  /** Khi true (SELF conv) hiện thêm nút Nhắc nhở / Checklist / Bookmark bên dưới. */
  selfConv?: boolean;
  /** Khi true (GROUP/CHANNEL) hiện nút Bình chọn trong menu. */
  isGroup?: boolean;
  /** DIRECT conversation với BotFather — bật slash autocomplete cho command v1. */
  botFatherCommands?: boolean;
  wallpaperActive?: boolean;
  onWebappMenuClick?: () => void;
  stickerBotConversation?: boolean;
};

export function MessageInput({
  conversationId,
  conversationType,
  disabled,
  selfConv,
  isGroup,
  botFatherCommands,
  wallpaperActive,
  onWebappMenuClick,
  stickerBotConversation,
}: MessageInputProps) {
  const {
    editorRef,
    mention,
    hasContent,
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
    sendInlineResult,
    exitEdit,
    handleEmojiSelect,
  } = useMessageComposer(conversationId, disabled, stickerBotConversation);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [mobilePickerHost, setMobilePickerHost] = useState<HTMLDivElement | null>(null);
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const [plaintext, setPlaintext] = useState("");
  const [switchValue, setSwitchValue] = useState<SerializedMessage | null>(null);
  const [commandItems, setCommandItems] = useState<BotFatherCommand[]>([]);
  const [commandActiveIndex, setCommandActiveIndex] = useState(0);
  const draftCommand = useMessageDraftCommandStore((s) => s.byConv[conversationId]);
  const clearDraftCommand = useMessageDraftCommandStore((s) => s.clearDraftCommand);
  const shareContact = useShareContact(conversationId);
  const { recorder, sending, stopAndSend } = useVoiceMessage(conversationId);
  const isCommandSuggestOpen = commandItems.length > 0;
  const inline = useInlineMode({
    conversationId,
    conversationType,
    plaintext,
    disabled: disabled || isEditing,
  });

  // Lỗi micro (chặn quyền / không có thiết bị) → báo cho người dùng.
  useEffect(() => {
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state tạm của popup khi đổi chat/chế độ composer.
    setCommandItems([]);
    setCommandActiveIndex(0);
    setPlaintext("");
  }, [conversationId, botFatherCommands, isEditing]);

  useEffect(() => {
    if (!draftCommand || disabled || isEditing) return;
    editorRef.current?.setPlainText(draftCommand.text);
    editorRef.current?.focus();
    handleUpdate(draftCommand.text.trim().length > 0);
    clearDraftCommand(conversationId, draftCommand.id);
  }, [
    clearDraftCommand,
    conversationId,
    disabled,
    draftCommand,
    editorRef,
    handleUpdate,
    isEditing,
  ]);

  function updateCommandSuggestions(plaintext: string) {
    if (!botFatherCommands || isEditing || disabled) {
      setCommandItems([]);
      return;
    }
    const items = matchBotFatherCommands(plaintext.trim());
    setCommandItems(items);
    setCommandActiveIndex(0);
  }

  function selectCommand(command: BotFatherCommand) {
    editorRef.current?.setPlainText(command.insertText);
    editorRef.current?.focus();
    setCommandItems([]);
    setCommandActiveIndex(0);
  }

  function handleCommandKeyDown(event: KeyboardEvent): boolean {
    if (!isCommandSuggestOpen) return false;
    if (event.key === "ArrowDown") {
      setCommandActiveIndex((i) => (i + 1) % commandItems.length);
      return true;
    }
    if (event.key === "ArrowUp") {
      setCommandActiveIndex(
        (i) => (i - 1 + commandItems.length) % commandItems.length,
      );
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      selectCommand(commandItems[commandActiveIndex] ?? commandItems[0]);
      return true;
    }
    if (event.key === "Escape") {
      setCommandItems([]);
      setCommandActiveIndex(0);
      return true;
    }
    return false;
  }

  function handleEditorUpdate(has: boolean, plaintext: string) {
    setPlaintext(plaintext);
    handleUpdate(has);
    updateCommandSuggestions(plaintext);
  }

  function selectInlineBot(bot: InlineBotSummary) {
    const next = `@${bot.username} `;
    editorRef.current?.setPlainText(next);
    editorRef.current?.focus();
    setPlaintext(next);
    handleUpdate(true);
  }

  function selectInlineResult(result: InlineResult) {
    const selection = inline.buildSelection(result);
    if (!selection) return;
    setPlaintext("");
    sendInlineResult(selection);
  }

  function toggleExpandedEditor() {
    setSwitchValue(editorRef.current?.serialize() ?? {
      plaintext,
      mentions: [],
      richText: null,
    });
    setExpanded((value) => !value);
  }

  useEffect(() => {
    if (switchValue === null) return;
    editorRef.current?.setSerialized(switchValue);
    editorRef.current?.focus();
  }, [expanded, editorRef, switchValue]);

  const actions = (
    <ComposerActions
      conversationId={conversationId}
      disabled={disabled}
      isEditing={isEditing}
      expanded={expanded}
      selfDestructTtl={selfDestructTtl}
      onFiles={addFiles}
      onSelfDestruct={setSelfDestructTtl}
      onScheduleClick={() => setScheduleOpen(true)}
      onContactClick={() => setContactOpen(true)}
      onEmojiSelect={handleEmojiSelect}
      onToggleExpanded={toggleExpandedEditor}
      onWebappClick={onWebappMenuClick}
      onAiClick={() => useAiWindowStore.getState().open()}
      onPollClick={isGroup ? () => setPollOpen(true) : undefined}
      stickerBotConversation={stickerBotConversation}
      mobilePickerHost={mobilePickerHost}
      onRequestEditorFocus={() => editorRef.current?.focus()}
      mobilePickerOpen={mobilePickerOpen}
      onMobilePickerOpenChange={setMobilePickerOpen}
    />
  );

  const editorPlaceholder = isEditing
    ? "Chỉnh sửa tin nhắn (Enter để lưu, Esc để huỷ)..."
    : "Nhập tin nhắn...";
  const editorEl = expanded ? (
    <RichMessageEditor
      ref={editorRef}
      placeholder={editorPlaceholder}
      initialValue={switchValue ?? {
        plaintext,
        mentions: [],
        richText: null,
      }}
      focusOnMount
      disabled={disabled}
      expanded
      mentionSuggestion={mention.suggestion}
      isMentionOpen={mention.isMentionOpen}
      onUpdate={handleEditorUpdate}
      onEnter={() => void submit()}
      onEscape={isEditing ? exitEdit : undefined}
      onCommandKeyDown={handleCommandKeyDown}
      onPasteFiles={handlePasteFiles}
      onEditor={setEditor}
      onFocusRequest={() => setMobilePickerOpen(false)}
    />
  ) : (
    <PlainMessageEditor
      ref={editorRef}
      value={plaintext}
      placeholder={editorPlaceholder}
      disabled={disabled}
      onUpdate={handleEditorUpdate}
      onEnter={() => void submit()}
      onEscape={isEditing ? exitEdit : undefined}
      onCommandKeyDown={handleCommandKeyDown}
      onPasteFiles={handlePasteFiles}
      onFocusRequest={() => setMobilePickerOpen(false)}
    />
  );

  const sendEl =
    hasContent || attachments.length > 0 ? (
      <Button
        variant="outline"
        size="icon-sm"
        onPointerDown={(event) => {
          // Chỉ chặn button lấy focus khi người dùng đang gõ. Nếu keyboard đang
          // đóng (ví dụ gửi attachment), button hoạt động mà không tự mở keyboard.
          if (editorRef.current?.isFocused()) event.preventDefault();
        }}
        onClick={() => {
          const shouldKeepKeyboard = Boolean(editorRef.current?.isFocused());
          void submit();
          if (shouldKeepKeyboard) editorRef.current?.focus();
        }}
        isLoading={isEditing ? isSavingEdit : isUploading}
        disabled={disabled}
        aria-label={isEditing ? "Lưu chỉnh sửa" : "Gửi"}
        title={isEditing ? "Lưu (Enter)" : "Gửi"}
        className="shrink-0 border-none "
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
    <div
      className={cn(
        "shrink-0 border-t py-2 pl-[max(var(--safe-left),0.75rem)] pr-[max(var(--safe-right),0.75rem)] max-md:pb-[max(var(--safe-bottom),0.5rem)] md:rounded-2xl md:border md:px-4 md:shadow-subtle",
        wallpaperActive ? "bg-sidebar" : "bg-sidebar",
      )}
      data-message-composer
    >
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
            <span className="truncate text-[12px] text-muted-foreground">
              {replying.snippet}
            </span>
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
      <InlineModePopup
        botSuggestions={inline.bots}
        results={inline.results}
        showBotSuggestions={inline.showBotSuggestions}
        showResults={inline.showResults}
        isSearchingBots={inline.isSearchingBots}
        isQuerying={inline.isQuerying}
        error={inline.error}
        onSelectBot={selectInlineBot}
        onSelectResult={selectInlineResult}
      />
      <MentionSuggestPopup mention={mention.popup} />
      <BotFatherCommandSuggestPopup
        items={commandItems}
        activeIndex={commandActiveIndex}
        onActiveIndexChange={setCommandActiveIndex}
        onSelect={selectCommand}
      />
      {!isEditing && (
        <AttachmentTray
          attachments={attachments}
          onRemove={remove}
          onRemoveAll={removeAll}
        />
      )}
      <div className="rounded-2xl ">
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
              <div className="flex items-center gap-1.5">
                {sendEl}
              </div>
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
      <div ref={setMobilePickerHost} className="empty:hidden md:hidden" />
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
            <span className="mr-1 text-xs text-muted-foreground">Tạo:</span>
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
          <ReminderDialog
            open={reminderOpen}
            onClose={() => setReminderOpen(false)}
          />
          <ChecklistDialog
            open={checklistOpen}
            onClose={() => setChecklistOpen(false)}
          />
          <BookmarkDialog
            open={bookmarkOpen}
            onClose={() => setBookmarkOpen(false)}
          />
        </>
      )}
    </div>
  );
}
