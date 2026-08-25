'use client';

import { FileText, Plus, Search } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useCreatePage } from '@/features/notes/hooks/use-mutations';
import { useSearch } from '@/features/notes/hooks/use-query';
import { getRecentPages } from '@/features/notes/lib/recent-pages';
import { searchSnippetSegments } from '@/features/notes/lib/search-snippet';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { cn } from '@/lib/utils/cn';

const SEARCH_DEBOUNCE_MS = 250;

type QuickSearchItem =
  | { kind: 'page'; pageId: string; title: string; icon: string | null; snippet?: string }
  | { kind: 'create'; title: string };

function ItemIcon({ icon }: { icon: string | null }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
      {icon ? <span className="text-sm leading-none">{icon}</span> : <FileText className="size-3.5" />}
    </span>
  );
}

function ResultRow({ item, isSelected, onHover, onSelect }: {
  item: QuickSearchItem;
  isSelected: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={isSelected}
        className={cn(
          'flex w-full min-w-0 items-center gap-2.5 px-4 py-2 text-start outline-none',
          isSelected && 'bg-sidebar-accent',
        )}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        {item.kind === 'create' ? (
          <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
            <Plus className="size-3.5" />
          </span>
        ) : (
          <ItemIcon icon={item.icon} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">
            {item.kind === 'create' ? `Tạo trang "${item.title}"` : (item.title || 'Không có tiêu đề')}
          </span>
          {item.kind === 'page' && item.snippet && (
            <span className="block truncate text-xs text-muted-foreground">
              {searchSnippetSegments(item.snippet).map((segment, index) => (
                segment.highlighted
                  ? <b key={index} className="font-semibold text-foreground">{segment.text}</b>
                  : <span key={index}>{segment.text}</span>
              ))}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function ResultsSkeleton() {
  return (
    <div data-testid="quick-search-loading" className="space-y-2 px-4 py-3">
      {[0, 1, 2].map((index) => <Skeleton key={index} className="h-9 w-full" />)}
    </div>
  );
}

interface QuickSearchDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPage: (pageId: string) => void;
}

export function QuickSearchDialog({ workspaceId, open, onOpenChange, onSelectPage }: QuickSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const searchQuery = useSearch(workspaceId, trimmedQuery);
  const createPage = useCreatePage();

  // Đồng bộ lúc render thay vì trong effect (dialog không unmount giữa các
  // lần dùng nên cần dọn lại ô nhập mỗi lần đóng) — cùng pattern với
  // PromptDialog/ScheduleMessageDialog.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) { setQuery(''); setSelectedIndex(0); }
  }

  const items = useMemo<QuickSearchItem[]>(() => {
    if (trimmedQuery === '') {
      return getRecentPages(workspaceId).map((page) => (
        { kind: 'page', pageId: page.pageId, title: page.title, icon: page.icon }
      ));
    }
    if (searchQuery.data?.length) {
      return searchQuery.data.map((result) => (
        { kind: 'page', pageId: result.pageId, title: result.title, icon: result.icon, snippet: result.snippet }
      ));
    }
    if (!searchQuery.isLoading && !searchQuery.isError) {
      return [{ kind: 'create', title: trimmedQuery }];
    }
    return [];
  }, [searchQuery.data, searchQuery.isError, searchQuery.isLoading, trimmedQuery, workspaceId]);

  const [prevItemsLength, setPrevItemsLength] = useState(items.length);
  if (items.length !== prevItemsLength) {
    setPrevItemsLength(items.length);
    setSelectedIndex(0);
  }

  function selectItem(item: QuickSearchItem) {
    if (item.kind === 'page') { onSelectPage(item.pageId); onOpenChange(false); return; }
    createPage.mutate({ workspaceId, title: item.title }, {
      onSuccess: (page) => { onSelectPage(page.id); onOpenChange(false); },
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[selectedIndex];
      if (item) selectItem(item);
    }
  }

  let body;
  if (trimmedQuery === '' && items.length === 0) {
    body = <p className="px-4 py-8 text-center text-sm text-muted-foreground">Gõ để tìm trang</p>;
  } else if (trimmedQuery !== '' && searchQuery.isLoading) {
    body = <ResultsSkeleton />;
  } else if (trimmedQuery !== '' && searchQuery.isError) {
    body = <p className="px-4 py-8 text-center text-sm text-muted-foreground">Không tìm được kết quả</p>;
  } else {
    body = (
      <ul role="listbox" aria-label="Kết quả tìm kiếm" className="max-h-[360px] overflow-y-auto py-2">
        {trimmedQuery === '' && (
          <li className="px-4 pb-1 pt-1 text-xs font-medium text-muted-foreground">Gần đây</li>
        )}
        {trimmedQuery !== '' && items[0]?.kind === 'create' && (
          <li className="px-4 pb-1 pt-1 text-xs font-medium text-muted-foreground">
            Không tìm thấy «{trimmedQuery}»
          </li>
        )}
        {items.map((item, index) => (
          <ResultRow
            key={item.kind === 'page' ? item.pageId : 'create'}
            item={item}
            isSelected={index === selectedIndex}
            onHover={() => setSelectedIndex(index)}
            onSelect={() => selectItem(item)}
          />
        ))}
      </ul>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15vh] max-w-[640px] translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Tìm nhanh</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm trang…"
            aria-label="Tìm trang"
            className="h-14 w-full min-w-0 border-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        {body}
      </DialogContent>
    </Dialog>
  );
}
