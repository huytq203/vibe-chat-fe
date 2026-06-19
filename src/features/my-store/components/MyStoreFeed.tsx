'use client';

import { useRef, useCallback } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useStoreMessages } from '@/features/my-store/hooks/use-query';
import { useDeleteStoreMessage } from '@/features/my-store/hooks/use-mutations';
import { useDecryptedBody } from '@/features/chat/hooks/use-decrypted-message';
import type { StoreMessage, StoreNoteType } from '@/features/my-store/types';

// Các loại ghi chú chỉ hiển thị ở list riêng (MyStoreNoteListView), KHÔNG render thành bubble.
const NOTE_TYPES: StoreNoteType[] = ['REMINDER', 'CHECKLIST', 'BOOKMARK'];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function MessageItem({ message }: { message: StoreMessage }) {
  const del = useDeleteStoreMessage();
  // Giải mã text FE-encrypted (tin thường → trả plaintext ngay).
  const decrypted = useDecryptedBody(message);
  const body = decrypted.failed
    ? 'Không giải mã được'
    : decrypted.loading
      ? 'Đang giải mã…'
      : decrypted.text;

  if (message.isDeleted) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground italic max-w-xs">
          Tin nhắn đã bị gỡ
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-end px-4 py-1">
      <div className="flex flex-col items-end gap-1 max-w-[85%]">
        {body && (
          <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground whitespace-pre-wrap break-words max-w-xs">
            {body}
          </div>
        )}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-muted-foreground">{formatTime(message.createdAt)}</span>
          <button
            onClick={() => del.mutate(message.id)}
            disabled={del.isPending}
            className="text-muted-foreground hover:text-red-500 transition-colors p-0.5 rounded"
            title="Gỡ tin nhắn"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function MyStoreFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useStoreMessages();
  const loaderRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollTop < 80 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allMessages = (data?.pages ?? [])
    .flatMap((p) => p.items)
    .filter((m) => !NOTE_TYPES.includes(m.type as StoreNoteType))
    .reverse();

  if (allMessages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">Chưa có ghi chú nào</p>
        <p className="text-xs">Bắt đầu ghi chú bên dưới</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse"
      onScroll={handleScroll}
    >
      <div className="flex flex-col py-2">
        {isFetchingNextPage && (
          <div className="flex justify-center py-2" ref={loaderRef}>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {allMessages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}
