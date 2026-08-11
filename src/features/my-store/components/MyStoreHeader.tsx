'use client';

import { Archive, ChevronRight, FolderOpen, MessageSquare } from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { cn } from '@/lib/utils/cn';

export type MyStoreTab = 'notes' | 'files';

type MyStoreHeaderProps = {
  activeTab: MyStoreTab;
  onTabChange: (tab: MyStoreTab) => void;
  /** Mobile-only: mở panel thông tin. Desktop panel luôn hiện nên bỏ qua. */
  onOpenInfo?: () => void;
};

/** Header card nổi của "Kho của tôi" — tách khỏi khung nội dung, khe hở lộ nền ảnh theo theme (giống ChatHeader). */
export function MyStoreHeader({ activeTab, onTabChange, onOpenInfo }: MyStoreHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-sidebar/75 px-4 py-3 backdrop-blur-md md:rounded-2xl md:border md:shadow-subtle">
      {isMobile && onOpenInfo ? (
        // Vùng chạm phủ gần trọn chiều cao header (40px) nhờ margin âm bù padding —
        // mở rộng đích chạm mà không làm header cao thêm.
        <button
          type="button"
          onClick={onOpenInfo}
          aria-label="Mở thông tin kho của tôi"
          className="-mx-2 -my-2.5 flex items-center gap-2 rounded-lg px-2 py-2.5 transition-colors active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Archive className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Kho của tôi</h1>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      ) : (
        <>
          <Archive className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Kho của tôi</h1>
        </>
      )}

      <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-border p-0.5">
        <button
          type="button"
          onClick={() => onTabChange('notes')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            activeTab === 'notes'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <MessageSquare className="h-3 w-3" />
          Ghi chú
        </button>
        <button
          type="button"
          onClick={() => onTabChange('files')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            activeTab === 'files'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <FolderOpen className="h-3 w-3" />
          File
        </button>
      </div>
    </div>
  );
}
