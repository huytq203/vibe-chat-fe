'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ImageOff, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useGiphyGifs } from '@/features/chat/hooks/use-giphy';
import { GiphyError } from '@/services/giphy.api';
import type { GiphyItem } from '@/features/chat/types/gif';
import { cn } from '@/lib/utils/cn';

interface GifPickerProps {
  onPick: (gif: GiphyItem) => void;
  sendingId?: string | null;
}

interface GifGridProps extends GifPickerProps {
  items: GiphyItem[];
  isFetchingNextPage: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

function StatusBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-[13px] text-muted-foreground">
      {children}
    </div>
  );
}

function GifSkeleton() {
  return (
    <div data-testid="gif-skeleton" className="grid flex-1 grid-cols-2 content-start gap-2 overflow-hidden p-2 md:grid-cols-3">
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function GifGrid({ items, onPick, sendingId, isFetchingNextPage, sentinelRef }: GifGridProps) {
  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="columns-2 gap-2 md:columns-3">
        {items.map((gif) => (
          <button
            key={gif.id}
            type="button"
            disabled={Boolean(sendingId)}
            onClick={() => onPick(gif)}
            aria-label={gif.title || 'GIF'}
            style={{ aspectRatio: `${gif.previewWidth} / ${gif.previewHeight}` }}
            className={cn(
              'relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-lg bg-muted transition-opacity',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              sendingId && sendingId !== gif.id && 'opacity-40',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- CDN động cần giữ animation GIF. */}
            <img src={gif.previewUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            {sendingId === gif.id && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </span>
            )}
          </button>
        ))}
      </div>
      <div ref={sentinelRef} className="h-6" />
      {isFetchingNextPage && (
        <p className="py-1 text-center text-[12px] text-muted-foreground">Đang tải thêm...</p>
      )}
    </div>
  );
}

export function GifPicker({ onPick, sendingId }: GifPickerProps) {
  const [term, setTerm] = useState('');
  const query = useDebouncedValue(term, 350);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const {
    data,
    isPending,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useGiphyGifs(query);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const notConfigured = error instanceof GiphyError && error.code === 'GIPHY_NOT_CONFIGURED';

  return (
    <div className="flex h-full flex-col">
      <div className="relative shrink-0 p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <label className="sr-only" htmlFor="gif-search">Tìm GIF</label>
        <input
          id="gif-search"
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Tìm GIF trên GIPHY..."
          className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {isPending ? (
        <GifSkeleton />
      ) : isError ? (
        <StatusBox>
          <ImageOff className="h-7 w-7" />
          <p>{notConfigured ? 'Tính năng GIF chưa được cấu hình' : 'Không tải được GIF'}</p>
          {!notConfigured && (
            <Button variant="ghost" size="sm" onClick={() => void refetch()}>Thử lại</Button>
          )}
        </StatusBox>
      ) : items.length === 0 ? (
        <StatusBox>
          <ImageOff className="h-7 w-7" />
          <p>{query ? `Không tìm thấy GIF cho "${query}"` : 'Chưa có GIF nào'}</p>
        </StatusBox>
      ) : (
        <GifGrid
          items={items}
          onPick={onPick}
          sendingId={sendingId}
          isFetchingNextPage={isFetchingNextPage}
          sentinelRef={sentinelRef}
        />
      )}

      <p className="shrink-0 border-t border-border px-3 py-1.5 text-center text-[10.5px] text-muted-foreground">
        Powered by GIPHY
      </p>
    </div>
  );
}
