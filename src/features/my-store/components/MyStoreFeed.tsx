'use client';

import { useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useStoreMessages } from '@/features/my-store/hooks/use-query';
import type { StoreMessage, StoreNoteType } from '@/features/my-store/types';
import { StoreMessageBubble } from './StoreMessageBubble';

// Các loại ghi chú chỉ hiển thị ở list riêng (MyStoreNoteListView), KHÔNG render thành bubble.
const NOTE_TYPES: StoreNoteType[] = ['REMINDER', 'CHECKLIST', 'BOOKMARK'];

function MessageItem({ message, repliedTo }: { message: StoreMessage; repliedTo: StoreMessage | null }) {
  return (
    <div className="relative px-5 pb-1 [@media(hover:hover)]:hover:z-10">
      <StoreMessageBubble message={message} repliedTo={repliedTo} />
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
    .filter((m) => !m.isDeleted && !NOTE_TYPES.includes(m.type as StoreNoteType))
    .reverse();
  const messageById = new Map(allMessages.map((m) => [m.id, m]));

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
      <div className="flex flex-col py-4">
        {isFetchingNextPage && (
          <div className="flex justify-center py-2" ref={loaderRef}>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {allMessages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            repliedTo={msg.replyToMessageId ? messageById.get(msg.replyToMessageId) ?? null : null}
          />
        ))}
      </div>
    </div>
  );
}
