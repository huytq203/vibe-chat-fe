'use client';

import { Archive, FolderOpen, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type MyStoreTab = 'notes' | 'files';

type MyStoreHeaderProps = {
  activeTab: MyStoreTab;
  onTabChange: (tab: MyStoreTab) => void;
};

/** Header card nổi của "Kho của tôi" — tách khỏi khung nội dung, khe hở lộ nền ảnh theo theme (giống ChatHeader). */
export function MyStoreHeader({ activeTab, onTabChange }: MyStoreHeaderProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-2xl border bg-sidebar/75 px-4 py-3 shadow-subtle backdrop-blur-md">
      <Archive className="h-5 w-5 text-primary" />
      <h1 className="text-base font-semibold">Kho của tôi</h1>

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
