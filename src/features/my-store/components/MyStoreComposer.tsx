'use client';

import { useRef, useState } from 'react';
import { Bell, BookmarkPlus, CheckSquare, Paperclip, Reply, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import {
  useSendStoreMessage,
  useSendStoreMediaMessage,
} from '@/features/my-store/hooks/use-mutations';
import { useMessageReplyStore } from '@/features/chat/stores/message-reply.store';
import { ReminderDialog } from './ReminderDialog';
import { ChecklistDialog } from './ChecklistDialog';
import { BookmarkDialog } from './BookmarkDialog';

type ActiveDialog = 'reminder' | 'checklist' | 'bookmark' | null;

type MyStoreComposerProps = {
  conversationId: string | null;
};

export function MyStoreComposer({ conversationId }: MyStoreComposerProps) {
  const [text, setText] = useState('');
  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const send = useSendStoreMessage();
  const sendMedia = useSendStoreMediaMessage();
  const fileRef = useRef<HTMLInputElement>(null);
  const replyingState = useMessageReplyStore((s) => s.replying);
  const cancelReply = useMessageReplyStore((s) => s.cancelReply);
  const replying =
    conversationId && replyingState?.conversationId === conversationId ? replyingState : null;

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;
    send.mutate(
      { plaintext: trimmed, replyToMessageId: replying?.messageId },
      {
        onSuccess: () => {
          setText('');
          cancelReply();
        },
      },
    );
  }

  function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // cho phép chọn lại cùng file
    if (files.length === 0) return;
    // Ảnh/video/file gửi vào myStore tính vào quota 5GB (BE chặn nếu vượt).
    for (const file of files) {
      sendMedia.mutate({ file });
    }
    toast.info(files.length > 1 ? `Đang tải lên ${files.length} tệp…` : 'Đang tải lên…');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <div className="border-t border-border p-3 flex flex-col gap-2">
        {replying && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
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
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={handlePickFiles}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={sendMedia.isPending}
            className="rounded-xl p-2.5 shrink-0 bg-accent text-muted-foreground hover:bg-accent/70 transition-colors disabled:opacity-60"
            title="Đính kèm ảnh/tệp"
            aria-label="Đính kèm ảnh/tệp"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            className="flex-1 rounded-xl border border-border bg-accent/30 px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none min-h-[40px] max-h-[120px]"
            placeholder="Ghi chú... (Enter để gửi, Shift+Enter xuống dòng)"
            value={text}
            rows={1}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || send.isPending}
            className={cn(
              'rounded-xl p-2.5 transition-colors shrink-0',
              text.trim()
                ? 'bg-primary text-primary-foreground hover:bg-primary/80'
                : 'bg-accent text-muted-foreground',
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Special type buttons */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Tạo:</span>
          <button
            onClick={() => setDialog('reminder')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-amber-300/50 hover:border-amber-400 transition-colors"
          >
            <Bell className="h-3 w-3" />
            Nhắc nhở
          </button>
          <button
            onClick={() => setDialog('checklist')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-primary hover:bg-primary/5 border border-primary/20 hover:border-primary/40 transition-colors"
          >
            <CheckSquare className="h-3 w-3" />
            Checklist
          </button>
          <button
            onClick={() => setDialog('bookmark')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-blue-300/50 hover:border-blue-400 transition-colors"
          >
            <BookmarkPlus className="h-3 w-3" />
            Bookmark
          </button>
        </div>
      </div>

      <ReminderDialog open={dialog === 'reminder'} onClose={() => setDialog(null)} />
      <ChecklistDialog open={dialog === 'checklist'} onClose={() => setDialog(null)} />
      <BookmarkDialog open={dialog === 'bookmark'} onClose={() => setDialog(null)} />
    </>
  );
}
