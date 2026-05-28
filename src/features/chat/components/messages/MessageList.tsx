'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '@/features/auth';
import { useConversation, useMessages } from '../../hooks/use-query';
import { useTypingStore } from '../../stores/typing.store';
import type { Message } from '../../types';
import { buildMemberNameMap } from '../../utils';
import { MessageBubble } from './MessageBubble';
import { TypingBubble } from './TypingBubble';

type MessageListProps = {
  conversationId: string;
};

const EMPTY_TYPING: string[] = [];

export function MessageList({ conversationId }: MessageListProps) {
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const { data: conversation } = useConversation(conversationId);
  const memberNames = useMemo(() => buildMemberNameMap(conversation), [conversation]);
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages(conversationId);

  const messages = useMemo<Message[]>(() => {
    if (!data) return [];
    return data.pages.flatMap((p) => p.items).slice().reverse();
  }, [data]);

  const typingUserIds = useTypingStore(
    (s) => s.byConv[conversationId] ?? EMPTY_TYPING,
  );
  const otherTypingIds = useMemo(
    () => typingUserIds.filter((id) => id !== meId),
    [typingUserIds, meId],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    if (!last || last.id === lastIdRef.current) return;
    lastIdRef.current = last.id;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (otherTypingIds.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [otherTypingIds.length]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    if (el.scrollTop <= 40) void fetchNextPage();
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Đang tải tin nhắn...
      </div>
    );
  }

  if (messages.length === 0 && otherTypingIds.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Hãy gửi tin nhắn đầu tiên 👋
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 space-y-1 overflow-y-auto px-5 pb-2 pt-4"
    >
      {isFetchingNextPage && (
        <div className="py-2 text-center text-[11px] text-muted-foreground">Đang tải thêm...</div>
      )}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const showAvatar = m.senderId !== meId && (!prev || prev.senderId !== m.senderId);
        return (
          <MessageBubble
            key={m.id}
            message={m}
            meId={meId}
            showAvatar={showAvatar}
            senderName={memberNames[m.senderId] ?? null}
            senderSeed={m.senderId}
          />
        );
      })}
      {otherTypingIds.map((userId, i) => {
        const lastMsg = messages[messages.length - 1];
        const prevSenderId = i === 0 ? lastMsg?.senderId : otherTypingIds[i - 1];
        const showAvatar = prevSenderId !== userId;
        return (
          <TypingBubble
            key={`typing-${userId}`}
            userId={userId}
            showAvatar={showAvatar}
            senderName={memberNames[userId] ?? null}
          />
        );
      })}
    </div>
  );
}
