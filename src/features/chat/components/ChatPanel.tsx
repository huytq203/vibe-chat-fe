'use client';

import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { useChatUIStore } from '../stores/chat-ui.store';
import { useConversation, usePresence } from '../hooks/use-query';
import { useMarkRead } from '../hooks/use-mutations';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatPanel() {
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const { selectedConversationId, rightPanelOpen, toggleRight } = useChatUIStore();
  const { data: conversation } = useConversation(selectedConversationId);
  const { mutate: markRead } = useMarkRead();
  const lastReadRef = useRef<string | null>(null);

  const convId = conversation?.id ?? null;
  const lastMessageId = conversation?.lastMessage?.id ?? null;
  const unreadCount = conversation?.unreadCount ?? 0;

  useEffect(() => {
    if (!convId || !lastMessageId || unreadCount <= 0) return;
    const key = `${convId}:${lastMessageId}`;
    if (lastReadRef.current === key) return;
    lastReadRef.current = key;
    markRead({ conversationId: convId, messageId: lastMessageId });
  }, [convId, lastMessageId, unreadCount, markRead]);

  const otherIds = conversation && conversation.type === 'DIRECT'
    ? conversation.memberIds.filter((id) => id !== meId)
    : [];
  const { data: presenceList } = usePresence(otherIds);
  const otherPresence = presenceList?.[0] ?? null;

  if (!selectedConversationId || !conversation) {
    return (
      <main className="flex h-full flex-1 flex-col items-center justify-center bg-background text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <MessageSquare className="h-7 w-7 text-primary/60" />
        </div>
        <p className="text-sm text-muted-foreground">Chọn một cuộc trò chuyện để bắt đầu</p>
      </main>
    );
  }

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <ChatHeader
        conversation={conversation}
        meId={meId}
        presence={otherPresence}
        rightOpen={rightPanelOpen}
        onToggleRight={toggleRight}
      />
      <MessageList conversationId={conversation.id} />
      <MessageInput conversationId={conversation.id} />
    </main>
  );
}
