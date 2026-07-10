'use client';

import { useMemo } from 'react';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useAuthStore } from '@/features/auth';
import { useMessageSearch } from '@/features/chat/hooks/use-query';
import { buildMemberNameMap, formatListTime } from '@/features/chat/utils';
import type { Conversation } from '@/features/chat/types';

const HINT_CLS = 'px-2 py-6 text-center text-[12px] text-muted-foreground';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Bôi đậm `term` trong `text` (không phân biệt hoa/thường, phân biệt dấu — theo BE). */
function Highlighted({ text, term }: { text: string; term: string }) {
  const q = term.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-primary/20 px-0.5 text-primary">{part}</mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

type MessageSearchResultsProps = {
  conversation: Conversation;
  /** Từ khoá thô (component tự debounce). */
  query: string;
  onJump: (messageId: string, createdAt: string) => void;
};

/** Danh sách kết quả tìm tin (debounce + highlight + phân trang). Dùng chung cho panel & dropdown. */
export function MessageSearchResults({ conversation, query, onJump }: MessageSearchResultsProps) {
  const debounced = useDebouncedValue(query, 300);
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const memberNames = useMemo(() => buildMemberNameMap(conversation), [conversation]);

  const { data, isLoading, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useMessageSearch(conversation.id, { key: debounced });
  const results = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  if (debounced.trim().length < 1) {
    return <p className={HINT_CLS}>Nhập từ khoá để tìm trong tin nhắn văn bản.</p>;
  }
  if (isLoading) return <p className={HINT_CLS}>Đang tìm…</p>;
  if (results.length === 0) {
    return <p className={HINT_CLS}>{isFetching ? 'Đang tìm…' : 'Không tìm thấy tin nhắn nào.'}</p>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {results.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onJump(m.id, m.createdAt)}
          className="flex cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold text-primary">
              {m.senderId === meId ? 'Bạn' : (memberNames[m.senderId] ?? 'Thành viên')}
            </span>
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              {formatListTime(m.createdAt)}
            </span>
          </div>
          <span className="line-clamp-2 text-[13px] text-foreground">
            <Highlighted
              text={m.plaintext ?? m.contentPreview ?? ''}
              term={debounced}
            />
          </span>
        </button>
      ))}

      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mt-1 w-full rounded-lg py-1.5 text-[12px] font-semibold text-primary hover:bg-muted disabled:cursor-wait disabled:opacity-70"
        >
          {isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}
