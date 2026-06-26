'use client';

import { useState, type FormEvent } from 'react';
import { Send, X } from 'lucide-react';
import { Input } from '@/components/ui/input/Input';
import { cn } from '@/lib/utils/cn';
import { useCallStore } from '@/features/call/stores/call.store';
import { useCallPro } from '@/features/call/hooks/useCallPro';

/** Panel chat ephemeral trong cuộc gọi (không lưu lịch sử hội thoại). */
export function CallChatPanel() {
  const chat = useCallStore((s) => s.chat);
  const directory = useCallStore((s) => s.call?.directory ?? {});
  const setChatOpen = useCallStore((s) => s.setChatOpen);
  const { send } = useCallPro();
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(text);
    setText('');
  };

  return (
    <div className="flex w-full flex-col border-l border-border bg-popover text-popover-foreground">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-foreground">Chat trong cuộc gọi</span>
        <button
          type="button"
          aria-label="Đóng chat"
          onClick={() => setChatOpen(false)}
          className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {chat.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">Chưa có tin nhắn</p>
        ) : (
          chat.map((m) => (
            <div key={m.id} className={cn('flex flex-col', m.mine && 'items-end')}>
              {!m.mine && (
                <span className="text-[10px] text-muted-foreground">
                  {directory[m.from]?.name ?? 'Thành viên'}
                </span>
              )}
              <span
                className={cn(
                  'max-w-[85%] break-words rounded-lg px-2.5 py-1.5 text-sm',
                  m.mine
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                {m.text}
              </span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhắn tin…"
          className="flex-1"
        />
        <button
          type="submit"
          aria-label="Gửi"
          disabled={!text.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
