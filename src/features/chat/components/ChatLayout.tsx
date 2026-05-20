'use client';

import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { useAuthStore } from '@/features/auth';
import { useChatUIStore } from '../stores/chat-ui.store';
import { useConversations } from '../hooks/use-query';
import { useChatRealtime } from '../hooks/useChatRealtime';
import { ConversationList } from './ConversationList';
import { ChatPanel } from './ChatPanel';
import { ContactInfo } from './ContactInfo';

export function ChatLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const { selectedConversationId, rightPanelOpen, setSelected } = useChatUIStore();
  const { data: conversations } = useConversations();
  useChatRealtime();

  useEffect(() => {
    if (selectedConversationId) return;
    const first = conversations?.[0];
    if (first) setSelected(first.id);
  }, [conversations, selectedConversationId, setSelected]);

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
