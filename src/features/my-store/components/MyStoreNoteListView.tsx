'use client';

import { ArrowLeft, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useStoreMessages } from '@/features/my-store/hooks/use-query';
import { useDeleteStoreNote } from '@/features/my-store/hooks/use-mutations';
import { ReminderCard } from './ReminderCard';
import { ChecklistCard } from './ChecklistCard';
import { BookmarkCard } from './BookmarkCard';
import type { StoreMessage, StoreNoteType } from '@/features/my-store/types';

export type NoteType = StoreNoteType;

type Props = {
  type: NoteType;
  title: string;
  emptyLabel: string;
  onBack: () => void;
  onClose: () => void;
};

function NoteCardBody({ message }: { message: StoreMessage }) {
  if (message.type === 'REMINDER') return <ReminderCard message={message} />;
  if (message.type === 'CHECKLIST') return <ChecklistCard message={message} />;
  return <BookmarkCard message={message} />;
}

/** 1 item trong list: card + nút xoá riêng (hiện khi hover). */
function NoteCard({ message, type }: { message: StoreMessage; type: NoteType }) {
  const del = useDeleteStoreNote();

  return (
    <div className="group relative">
      <NoteCardBody message={message} />
      <button
        type="button"
        onClick={() => del.mutate({ type, messageId: message.id })}
        disabled={del.isPending}
        aria-label="Xoá"
        title="Xoá"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-colors transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50 dark:hover:bg-red-950/30"
      >
        {del.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/** Sub-view: danh sách đầy đủ của 1 loại ghi chú (reminder/checklist/bookmark). */
export function MyStoreNoteListView({ type, title, emptyLabel, onBack, onClose }: Props) {
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useStoreMessages();

  // Dedupe theo id (cursor pagination + invalidate có thể trả trùng) → tránh key trùng.
  const items = Array.from(
    new Map(
      (data?.pages ?? [])
        .flatMap((p) => p.items)
        .filter((m) => !m.isDeleted && m.type === type)
        .map((m) => [m.id, m]),
    ).values(),
  );

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
      <header className="flex shrink-0 items-center gap-1 border-b border-border px-2 pb-3 pt-[18px]">
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Quay lại" title="Quay lại">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 truncate text-sm font-bold">{title}</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng" title="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-muted-foreground">
          Không tải được dữ liệu. Thử lại sau.
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
          {items.map((m) => (
            <NoteCard key={m.id} message={m} type={type} />
          ))}
          {hasNextPage && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-auto shrink-0 py-2 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {isFetchingNextPage ? 'Đang tải...' : 'Tải thêm'}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
