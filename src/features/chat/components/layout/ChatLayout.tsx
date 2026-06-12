'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { useAuthStore } from '@/features/auth';
import {
  useFaviconBadge,
  useFcmSetup,
  useNotificationRealtime,
} from '@/features/notifications';
import { useFriendRealtime } from '@/features/friends';
import { CallContainer, useCallRealtime } from '@/features/call';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { useConversations } from '@/features/chat/hooks/use-query';
import { useChatRealtime } from '@/features/chat/hooks/useChatRealtime';
import { ConversationList } from '@/features/chat/components/conversations/ConversationList';
import { ChatPanel } from './ChatPanel';
import { ContactInfo } from '@/features/chat/components/contact/ContactInfo';

export function ChatLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const rightPanelOpen = useChatUIStore((s) => s.rightPanelOpen);
  const mobilePanel = useChatUIStore((s) => s.mobilePanel);
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const isMobile = useIsMobile();
  const { data: conversations } = useConversations();
  const router = useRouter();
  useChatRealtime();
  useNotificationRealtime();
  useFriendRealtime();
  useCallRealtime();
  useFcmSetup();
  useFaviconBadge();

  useEffect(() => {
    if (selectedConversationId) return;
    const first = conversations?.[0];
    if (first) setSelected(first.id);
  }, [conversations, selectedConversationId, setSelected]);

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

  if (isMobile) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        {mobilePanel === 'list' && <ConversationList />}
        {mobilePanel === 'chat' && <ChatPanel />}
        {mobilePanel === 'contact' && selectedConversationId && <ContactInfo />}
        <CallContainer />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ConversationList />
      <ChatPanel />
      {rightPanelOpen && selectedConversationId && <ContactInfo />}
      <CallContainer />
    </div>
  );
}
