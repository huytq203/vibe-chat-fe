'use client';

import { useState } from 'react';
import { Archive, MessageSquare, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { MyStoreFeed } from './MyStoreFeed';
import { MyStoreComposer } from './MyStoreComposer';
import { FolderSidebar } from './FolderSidebar';
import { FilePanel } from './FilePanel';
import { useStoreFolders } from '@/features/my-store/hooks/use-query';

type ActiveTab = 'notes' | 'files';

export function MyStoreLayout() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const { data: folders } = useStoreFolders();

  const selectedFolder = folders?.find((f) => f.id === selectedFolderId) ?? null;

  return (
    <div className="flex h-full bg-background">
      {/* Left panel — always visible */}
      <div className="flex flex-col w-full max-w-2xl border-r border-border">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <Archive className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Kho của tôi</h1>

          <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setActiveTab('notes')}
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
              onClick={() => setActiveTab('files')}
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

        {/* Body */}
        {activeTab === 'notes' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <MyStoreFeed />
            <MyStoreComposer />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            <FolderSidebar
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
            />
            <div className="flex-1 min-w-0 flex flex-col">
              {selectedFolderId ? (
                <FilePanel
                  folderId={selectedFolderId}
                  folderName={selectedFolder?.name ?? 'Thư mục'}
                />
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2">
                  <FolderOpen className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Chọn một thư mục để xem file</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
