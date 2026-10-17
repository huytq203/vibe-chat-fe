'use client';

import { RotateCcw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';

export const BEFORE_SECTION_ID = 'ai-review-before';
export const AFTER_SECTION_ID = 'ai-review-after';

function scrollToSection(id: string) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}

function ChangeCount({ count, label, tone }: { count: number; label: string; tone: 'added' | 'removed' }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 rounded-[3px] ring-1 ring-inset',
          tone === 'removed' ? 'bg-danger/15 ring-danger/40' : 'bg-success/15 ring-success/45',
        )}
      />
      {count} {label}
    </span>
  );
}

interface AiReviewToolbarProps {
  addedCount?: number;
  isRestoring: boolean;
  onClose: () => void;
  onRestore: () => void;
  removedCount?: number;
  showJumps: boolean;
}

/** Thanh dính dưới PageTopbar: tóm tắt thay đổi, nhảy giữa hai bản, hoàn tác và đóng. */
export function AiReviewToolbar({
  addedCount = 0, isRestoring, onClose, onRestore, removedCount = 0, showJumps,
}: AiReviewToolbarProps) {
  const touchTarget = 'max-md:h-11';
  return (
    <div
      role="toolbar"
      aria-label="Xem thay đổi do AI"
      className="sticky top-[calc(3.5rem+var(--safe-top))] z-[9] flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-background/95 py-2 pl-[max(var(--safe-left),1rem)] pr-[max(var(--safe-right),0.5rem)] backdrop-blur-sm md:top-14 md:px-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          Thay đổi do AI
        </span>
        <span className="hidden min-w-0 items-center gap-3 md:inline-flex">
          <ChangeCount count={removedCount} label="khối đã xoá" tone="removed" />
          <ChangeCount count={addedCount} label="khối mới" tone="added" />
        </span>
      </div>
      <Button
        type="button" size="icon-sm" variant="ghost" aria-label="Đóng xem thay đổi" title="Đóng (Esc)"
        className={cn('order-2 md:order-3', 'max-md:size-11')} onClick={onClose}
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
      <div className="order-3 flex w-full items-center gap-1 md:order-2 md:w-auto">
        <span className="mr-auto inline-flex items-center gap-3 md:hidden">
          <ChangeCount count={removedCount} label="đã xoá" tone="removed" />
          <ChangeCount count={addedCount} label="mới" tone="added" />
        </span>
        {showJumps && (
          <>
            <Button type="button" size="xs" variant="ghost" className={touchTarget} onClick={() => scrollToSection(BEFORE_SECTION_ID)}>
              Bản trước
            </Button>
            <Button type="button" size="xs" variant="ghost" className={touchTarget} onClick={() => scrollToSection(AFTER_SECTION_ID)}>
              Bản sau
            </Button>
          </>
        )}
        <Button
          type="button" size="xs" variant="outline" className={cn('ml-1', touchTarget)}
          isLoading={isRestoring} onClick={onRestore}
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />Hoàn tác
        </Button>
      </div>
    </div>
  );
}
