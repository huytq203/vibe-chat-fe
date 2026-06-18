'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { useAuthStore } from '@/features/auth';
import {
  useElectronBadge,
  useFaviconBadge,
  useFcmSetup,
  useNotificationRealtime,
} from '@/features/notifications';
import { useFriendRealtime } from '@/features/friends';
import { CallContainer, useCallRealtime } from '@/features/call';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { useConversation, useConversations } from '@/features/chat/hooks/use-query';
import { useChatRealtime } from '@/features/chat/hooks/useChatRealtime';
import { ConversationList } from '@/features/chat/components/conversations/ConversationList';
import { ChatPanel } from './ChatPanel';
import { ContactInfo } from '@/features/chat/components/contact/ContactInfo';
import { InviteProfileModal } from '@/features/share-links/components/InviteProfileModal';
import { MyStoreInfoPanel, MyStoreFolderView } from '@/features/my-store';

export function ChatLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const rightPanelOpen = useChatUIStore((s) => s.rightPanelOpen);
  const myStoreOpen = useChatUIStore((s) => s.myStoreOpen);
  const myStoreFilesOpen = useChatUIStore((s) => s.myStoreFilesOpen);
  const setMyStoreFilesOpen = useChatUIStore((s) => s.setMyStoreFilesOpen);
  const mobilePanel = useChatUIStore((s) => s.mobilePanel);
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const isMobile = useIsMobile();
  const { data: conversations } = useConversations();
  const { data: selectedConv } = useConversation(selectedConversationId);
  const isSelfConv = selectedConv?.type === 'SELF';
  const router = useRouter();
  const searchParams = useSearchParams();
  useChatRealtime();
  useNotificationRealtime();
  useFriendRealtime();
  useCallRealtime();
  useFcmSetup();
  useFaviconBadge();
  useElectronBadge();

  // Rời Kho của tôi (chọn hội thoại khác) → thoát chế độ Tệp toàn màn hình.
  useEffect(() => {
    if (!isSelfConv && myStoreFilesOpen) setMyStoreFilesOpen(false);
  }, [isSelfConv, myStoreFilesOpen, setMyStoreFilesOpen]);

  useEffect(() => {
    if (myStoreOpen) return;
    if (selectedConversationId) return;
    if (searchParams.get('invite')) return;
    const first = conversations?.[0];
    if (first) setSelected(first.id);
  }, [conversations, myStoreOpen, selectedConversationId, setSelected, searchParams]);

  // SW post message khi user click OS notification → điều hướng trong tab.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; link?: string } | null;
      if (data?.type === 'NOTIFICATION_CLICK' && data.link) {
        try {
          const url = new URL(data.link, window.location.origin);
          // Backend cũ có thể gửi /chat?c=<id> → chuẩn hoá về /chat/<id>.
          const legacyId = url.pathname === '/chat' && url.searchParams.get('c');
          if (legacyId) router.push(`/chat/${legacyId}`);
          else router.push(`${url.pathname}${url.search}`);
        } catch {
          router.push(data.link);
        }
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  if (!hydrated || !isAuthed) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner size="md" variant="primary" />
      </div>
    );
  }

  const showFilesView = isSelfConv && myStoreFilesOpen;

  if (isMobile) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        {mobilePanel === 'list' && <ConversationList />}
        {mobilePanel === 'chat' && (
          showFilesView ? <MyStoreFolderView onBack={() => setMyStoreFilesOpen(false)} /> : <ChatPanel />
        )}
        {mobilePanel === 'contact' && selectedConversationId && (
          isSelfConv
            ? <MyStoreInfoPanel
                conversationId={selectedConversationId}
                onClose={() => setMobilePanel('chat')}
                onOpenFiles={() => { setMyStoreFilesOpen(true); setMobilePanel('chat'); }}
              />
            : <ContactInfo />
        )}
        <CallContainer />
        <InviteProfileModal />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ConversationList />
      {showFilesView ? (
        <MyStoreFolderView  onBack={() => setMyStoreFilesOpen(false)} />
      ) : (
        <>
          <ChatPanel />
          {rightPanelOpen && selectedConversationId && (
            isSelfConv
              ? <MyStoreInfoPanel
                  conversationId={selectedConversationId}
                  onClose={() => useChatUIStore.getState().setRightOpen(false)}
                  onOpenFiles={() => setMyStoreFilesOpen(true)}
                />
              : <ContactInfo />
          )}
        </>
      )}
      <CallContainer />
      <InviteProfileModal />
    </div>
  );
}
