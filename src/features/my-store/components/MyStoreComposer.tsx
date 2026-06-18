'use client';

import { useState } from 'react';
import { Bell, BookmarkPlus, CheckSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useSendStoreMessage } from '@/features/my-store/hooks/use-mutations';
import { ReminderDialog } from './ReminderDialog';
import { ChecklistDialog } from './ChecklistDialog';
import { BookmarkDialog } from './BookmarkDialog';

type ActiveDialog = 'reminder' | 'checklist' | 'bookmark' | null;

export function MyStoreComposer() {
  const [text, setText] = useState('');
  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const send = useSendStoreMessage();

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;
    send.mutate({ plaintext: trimmed }, { onSuccess: () => setText('') });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <div className="border-t border-border bg-background p-3 flex flex-col gap-2">
        <div className="flex items-end gap-2">
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
