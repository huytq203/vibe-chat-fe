'use client';

import { useState } from 'react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { MyStoreFeed } from './MyStoreFeed';
import { MyStoreComposer } from './MyStoreComposer';
import { StoreFileBrowser } from './StoreFileBrowser';
import { MyStoreHeader, type MyStoreTab } from './MyStoreHeader';
import { MyStoreInfoPanel } from './MyStoreInfoPanel';
import { useStoreConversation } from '@/features/my-store/hooks/use-query';
import { useMyStoreRealtime } from '@/features/my-store/hooks/useMyStoreRealtime';

export function MyStoreLayout() {
  const [activeTab, setActiveTab] = useState<MyStoreTab>('notes');
  const [infoOpen, setInfoOpen] = useState(false);
  const isMobile = useIsMobile();
  const { data: selfConv } = useStoreConversation();
  useMyStoreRealtime(selfConv?.id ?? null);

  // Mobile không đủ chỗ cho cột phải → panel chiếm trọn khung (thanh nav dưới vẫn giữ),
  // đóng bằng nút ✕ của chính panel. Giống cách ContactInfo chiếm màn bên khu chat.
  if (isMobile && infoOpen && selfConv?.id) {
    return (
      <MyStoreInfoPanel
        conversationId={selfConv.id}
        onClose={() => setInfoOpen(false)}
        onOpenFiles={() => {
          setActiveTab('files');
          setInfoOpen(false);
        }}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col md:gap-3">
      <MyStoreHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenInfo={selfConv?.id ? () => setInfoOpen(true) : undefined}
      />

      <div className="flex flex-1 min-h-0 gap-3">
        {activeTab === 'notes' ? (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background/75 backdrop-blur-md md:rounded-2xl md:border md:shadow-subtle">
            <MyStoreFeed />
            <MyStoreComposer conversationId={selfConv?.id ?? null} />
          </div>
        ) : (
          <StoreFileBrowser />
        )}

        {/* Gỡ hẳn khỏi cây trên mobile thay vì ẩn bằng CSS — panel cũ vẫn mount và
            subscribe query dù không nhìn thấy, gây fetch trùng với panel chiếm màn. */}
        {!isMobile && activeTab === 'notes' && selfConv?.id && (
          <MyStoreInfoPanel
            conversationId={selfConv.id}
            onOpenFiles={() => setActiveTab('files')}
          />
        )}
      </div>
    </div>
  );
}
