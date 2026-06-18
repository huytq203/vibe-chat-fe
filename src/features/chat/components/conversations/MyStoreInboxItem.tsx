'use client';

import { Archive } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type MyStoreInboxItemProps = {
  selected?: boolean;
  onClick: () => void;
};

/** Entry "Kho của tôi" cố định ở đầu danh sách — giống Saved Messages của Telegram. */
export function MyStoreInboxItem({ selected, onClick }: MyStoreInboxItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-left transition-colors',
        selected ? 'bg-primary/10' : 'hover:bg-muted',
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/30">
        <Archive className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <span className={cn('block truncate text-[14px] font-semibold', selected ? 'text-primary' : 'text-foreground')}>
          Kho của tôi
        </span>
        <span className="block truncate text-[12.5px] text-muted-foreground">
          Ghi chú · Nhắc nhở · File cá nhân
        </span>
      </div>
    </button>
  );
}
