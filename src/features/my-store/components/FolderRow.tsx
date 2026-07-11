'use client';

import { useState } from 'react';
import { ChevronRight, Folder, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { StoreFolder } from '@/features/my-store/types';

type FolderRowProps = {
  folder: StoreFolder;
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
};

/** 1 hàng thư mục trong StoreFileBrowser — click để "vào trong" (drill-in). */
export function FolderRow({ folder, onOpen, onRename, onDelete }: FolderRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer select-none transition-colors hover:bg-accent"
      onClick={() => onOpen(folder.id)}
    >
      <Folder className="h-4 w-4 shrink-0 text-amber-500" />
      <span className="text-sm truncate flex-1">{folder.name}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="Tuỳ chọn thư mục"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className={cn(
            'p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
            />
            <div className="absolute right-0 top-5 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onRename(folder.id);
                }}
              >
                <Pencil className="h-3 w-3" /> Đổi tên
              </button>
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(folder.id);
                }}
              >
                <Trash2 className="h-3 w-3" /> Xoá
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
