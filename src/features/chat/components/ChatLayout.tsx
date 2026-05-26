'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { useAuthStore } from '@/features/auth';
import {
  useFcmSetup,
  useNotificationRealtime,
} from '@/features/notifications';
import { useFriendRealtime } from '@/features/friends';
import { useChatUIStore } from '../stores/chat-ui.store';
import { useSelectedConversation } from '../hooks/useSelectedConversation';
import { useConversations } from '../hooks/use-query';
import { useChatRealtime } from '../hooks/useChatRealtime';
import { ConversationList } from './ConversationList';
import { ChatPanel } from './ChatPanel';
import { ContactInfo } from './ContactInfo';

export function ChatLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const rightPanelOpen = useChatUIStore((s) => s.rightPanelOpen);
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const { data: conversations } = useConversations();
  const router = useRouter();
  useChatRealtime();
  useNotificationRealtime();
  useFriendRealtime();
  useFcmSetup();

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
          router.push(`${url.pathname}${url.search}`);
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

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ConversationList />
      <ChatPanel />
      {rightPanelOpen && selectedConversationId && <ContactInfo />}
    </div>
  );
}
