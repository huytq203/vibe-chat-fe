'use client';

import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { MyStoreFeed } from './MyStoreFeed';
import { MyStoreComposer } from './MyStoreComposer';
import { FolderSidebar } from './FolderSidebar';
import { FilePanel } from './FilePanel';
import { MyStoreHeader, type MyStoreTab } from './MyStoreHeader';
import { MyStoreInfoPanel } from './MyStoreInfoPanel';
import { useStoreConversation, useStoreFolders } from '@/features/my-store/hooks/use-query';
import { useMyStoreRealtime } from '@/features/my-store/hooks/useMyStoreRealtime';

export function MyStoreLayout() {
  const [activeTab, setActiveTab] = useState<MyStoreTab>('notes');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const { data: folders } = useStoreFolders();
  const { data: selfConv } = useStoreConversation();
  useMyStoreRealtime(selfConv?.id ?? null);

  const selectedFolder = folders?.find((f) => f.id === selectedFolderId) ?? null;

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <MyStoreHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-1 min-h-0 gap-3">
        {activeTab === 'notes' ? (
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border bg-background/75 shadow-subtle backdrop-blur-md">
            <MyStoreFeed />
            <MyStoreComposer />
          </div>
        ) : (
          <>
            <FolderSidebar
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
            />
            <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border bg-background/75 shadow-subtle backdrop-blur-md">
              {selectedFolderId ? (
                <FilePanel
                  folderId={selectedFolderId}
                  folderName={selectedFolder?.name ?? 'Thư mục'}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FolderOpen className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Chọn một thư mục để xem file</p>
                </div>
              )}
            </div>
          </>
        )}

        {selfConv?.id && (
          <MyStoreInfoPanel conversationId={selfConv.id} onOpenFiles={() => setActiveTab('files')} />
        )}
      </div>
    </div>
  );
}
