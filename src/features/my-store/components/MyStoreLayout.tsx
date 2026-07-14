'use client';

import { useState } from 'react';
import { MyStoreFeed } from './MyStoreFeed';
import { MyStoreComposer } from './MyStoreComposer';
import { StoreFileBrowser } from './StoreFileBrowser';
import { MyStoreHeader, type MyStoreTab } from './MyStoreHeader';
import { MyStoreInfoPanel } from './MyStoreInfoPanel';
import { useStoreConversation } from '@/features/my-store/hooks/use-query';
import { useMyStoreRealtime } from '@/features/my-store/hooks/useMyStoreRealtime';

export function MyStoreLayout() {
  const [activeTab, setActiveTab] = useState<MyStoreTab>('notes');
  const { data: selfConv } = useStoreConversation();
  useMyStoreRealtime(selfConv?.id ?? null);

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <MyStoreHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-1 min-h-0 gap-3">
        {activeTab === 'notes' ? (
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border bg-background/75 shadow-subtle backdrop-blur-md">
            <MyStoreFeed />
            <MyStoreComposer conversationId={selfConv?.id ?? null} />
          </div>
        ) : (
          <StoreFileBrowser />
        )}

        {activeTab === 'notes' && selfConv?.id && (
          <MyStoreInfoPanel conversationId={selfConv.id} onOpenFiles={() => setActiveTab('files')} />
        )}
      </div>
    </div>
  );
}
