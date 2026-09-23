'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';
import type { Message } from '@/features/chat/types';

type Props = {
  conversationId: string;
  onAnalyze: (messageIds: string[]) => void;
  messages: Message[];
  senderNames: Record<string, string>;
  meId: string | null;
};

export function MessageSelectionToolbar({ conversationId, onAnalyze, messages, senderNames, meId }: Props) {
  const selection = useMessageSelectionStore();
  const active = selection.conversationId === conversationId;
  const exitSelection = selection.exit;

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        exitSelection();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, exitSelection]);

  if (!active) return null;

  const count = selection.selectedIds.size;

  async function copySelected() {
    const selected = messages
      .filter((message) => selection.selectedIds.has(message.id))
      .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
    const value = selected.map((message) => {
      const time = format(new Date(message.createdAt), 'HH:mm');
      const sender = message.senderId === meId ? 'Bạn' : (senderNames[message.senderId] ?? 'Người gửi');
      const content = message.plaintext?.trim() || (message.type === 'TEXT' ? message.contentPreview?.trim() : null) || '[Tệp đính kèm]';
      return `[${time}] ${sender}: ${content}`;
    }).join('\n');
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Đã sao chép ${selected.length} tin nhắn`);
    } catch {
      toast.error('Không sao chép được tin nhắn');
    }
  }

  return (
    <div role="toolbar" aria-label="Tin nhắn đã chọn" className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-sidebar px-[max(var(--safe-left),0.75rem)] py-2 pr-[max(var(--safe-right),0.75rem)] text-foreground md:rounded-t-xl">
      <span className="flex items-center gap-2 text-sm font-medium">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-primary/15 px-1.5 font-semibold tabular-nums text-primary">{count}</span>
        <span>Đã chọn</span>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={count === 0}
          onClick={() => {
            const ids = [...selection.selectedIds];
            selection.exit();
            onAnalyze(ids);
          }}
        >
          Phân tích &amp; xử lý
        </Button>
        <Button variant="outline" size="sm" disabled={count === 0} onClick={() => void copySelected()}>
          Sao chép
        </Button>
        <Button variant="ghost" size="sm" onClick={selection.exit}>Hủy</Button>
      </div>
    </div>
  );
}
