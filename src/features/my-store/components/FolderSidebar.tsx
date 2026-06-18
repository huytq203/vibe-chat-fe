'use client';

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, FolderPlus, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useStoreFolders } from '@/features/my-store/hooks/use-query';
import { useCreateFolder, useDeleteFolder } from '@/features/my-store/hooks/use-mutations';
import { QuotaBar } from './QuotaBar';
import type { StoreFolder } from '@/features/my-store/types';

type FolderSidebarProps = {
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
};

type FolderNodeProps = {
  folder: StoreFolder;
  level: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
};

function FolderNode({ folder, level, selectedId, onSelect, onDelete }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isSelected = selectedId === folder.id;
  const hasChildren = (folder.children ?? []).length > 0;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer select-none transition-colors',
          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground',
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          >
            <ChevronRight className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {expanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-amber-500" />
        )}
        <span className="text-sm truncate flex-1">{folder.name}</span>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className={cn(
              'p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors',
              menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-5 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                >
                  <Pencil className="h-3 w-3" /> Đổi tên
                </button>
                <button
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(folder.id); }}
                >
                  <Trash2 className="h-3 w-3" /> Xoá
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {(folder.children ?? []).map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderSidebar({ selectedFolderId, onSelectFolder }: FolderSidebarProps) {
  const { data: folders, isLoading } = useStoreFolders();
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createFolder.mutate(
      { name: newName.trim() },
      { onSuccess: () => { setNewName(''); setCreating(false); } },
    );
  }

  return (
    <div className="flex flex-col h-full border-r border-border w-56 shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thư mục</span>
        <button
          onClick={() => setCreating(true)}
          className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded"
          title="Tạo thư mục"
        >
          <FolderPlus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {creating && (
          <form onSubmit={submitCreate} className="px-2 py-1.5">
            <input
              autoFocus
              className="w-full rounded-lg border border-primary bg-background px-2 py-1 text-sm focus:outline-none"
              placeholder="Tên thư mục..."
              value={newName}
              maxLength={100}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => { if (!newName.trim()) setCreating(false); }}
              onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
            />
          </form>
        )}

        {(folders ?? []).map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            level={0}
            selectedId={selectedFolderId}
            onSelect={onSelectFolder}
            onDelete={(id) => {
              if (confirm('Xoá thư mục và toàn bộ file bên trong?')) {
                deleteFolder.mutate(id, {
                  onSuccess: () => {
                    if (selectedFolderId === id) onSelectFolder(null);
                  },
                });
              }
            }}
          />
        ))}

        {!isLoading && (folders ?? []).length === 0 && !creating && (
          <p className="text-xs text-muted-foreground text-center py-6 px-3">
            Chưa có thư mục nào
          </p>
        )}
      </div>

      <QuotaBar />
    </div>
  );
}
