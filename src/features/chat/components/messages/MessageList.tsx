'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth';
import { useConversation, useMessages, usePinnedMessages } from '@/features/chat/hooks/use-query';
import { useSelfDestruct } from '@/features/chat/hooks/useSelfDestruct';
import { useVirtualChatScroll } from '@/features/chat/hooks/useVirtualChatScroll';
import { useTypingStore } from '@/features/chat/stores/typing.store';
import { useMessageJumpStore } from '@/features/chat/stores/message-jump.store';
import { useSendErrorStore } from '@/features/chat/stores/send-error.store';
import type { MemberRole, Message } from '@/features/chat/types';
import {
  buildMemberAvatarMap,
  buildMemberNameMap,
  canPinMessage,
  getLeaderLabel,
} from '@/features/chat/utils';
import { MessageBubble } from './MessageBubble';
import { TypingBubble } from './TypingBubble';
import { LightboxProvider } from './LightboxProvider';

type MessageListProps = {
  conversationId: string;
  onAtBottom?: () => void;
};

const EMPTY_TYPING: string[] = [];
/** Trần số trang tự nạp khi nhảy tới 1 tin cũ (40 × 30 ≈ 1200 tin) — tránh nạp vô hạn. */
const MAX_JUMP_FETCHES = 40;

export function MessageList({ conversationId, onAtBottom }: MessageListProps) {
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const { data: conversation } = useConversation(conversationId);
  const memberNames = useMemo(() => buildMemberNameMap(conversation), [conversation]);
  const memberAvatars = useMemo(() => buildMemberAvatarMap(conversation), [conversation]);
  const showSenderNames = conversation ? conversation.type !== 'DIRECT' : false;

  const canPin = conversation ? canPinMessage(conversation, meId) : false;
  const hasPins = (conversation?.pinnedCount ?? 0) > 0;
  const { data: pinnedData } = usePinnedMessages(conversationId, hasPins);
  const pinnedIds = useMemo(
    () => new Set((Array.isArray(pinnedData) ? pinnedData : []).map((m) => m.id)),
    [pinnedData],
  );

  const showLeaderBadges =
    !!conversation && conversation.type !== 'DIRECT' && conversation.settings?.markLeaderMessages === true;
  const memberRoles = useMemo(() => {
    const map: Record<string, MemberRole> = {};
    conversation?.members?.forEach((m) => { map[m.userId] = m.role; });
    return map;
  }, [conversation]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useMessages(conversationId);

  const messages = useMemo<Message[]>(() => {
    if (!data) return [];
    return data.pages.flatMap((p) => p.items).slice().reverse();
  }, [data]);

  const messageById = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages],
  );

  useSelfDestruct(conversationId, messages);

  const sendError = useSendErrorStore((s) => s.byConv[conversationId]);

  const typingUserIds = useTypingStore((s) => s.byConv[conversationId] ?? EMPTY_TYPING);
  const otherTypingIds = useMemo(
    () => typingUserIds.filter((id) => id !== meId),
    [typingUserIds, meId],
  );

  const { scrollRef, virtualizer, showScrollDown, highlightId, scrollToBottom, scrollToMessage, handleScroll } = useVirtualChatScroll({
      messages,
      hasNextPage: hasNextPage ?? false,
      isFetchingNextPage,
      fetchNextPage,
      sendError,
      otherTypingCount: otherTypingIds.length,
      onAtBottom,
    });

  const jumpTarget = useMessageJumpStore((s) => s.target);
  const clearJump = useMessageJumpStore((s) => s.clear);
  const jumpFetchCountRef = useRef(0);
  const lastJumpIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!jumpTarget) {
      lastJumpIdRef.current = null;
      return;
    }
    if (lastJumpIdRef.current !== jumpTarget.id) {
      lastJumpIdRef.current = jumpTarget.id;
      jumpFetchCountRef.current = 0;
    }
    const idx = messages.findIndex((m) => m.id === jumpTarget.id);
    if (idx !== -1) {
      scrollToMessage(jumpTarget.id);
      clearJump();
      return;
    }
    if (isFetchingNextPage) return;
    const oldest = messages[0];
    const loadedPastTarget =
      oldest && new Date(oldest.createdAt).getTime() <= new Date(jumpTarget.createdAt).getTime();
    if (hasNextPage && !loadedPastTarget && jumpFetchCountRef.current < MAX_JUMP_FETCHES) {
      jumpFetchCountRef.current += 1;
      void fetchNextPage();
      return;
    }
    toast('Không tải được tin nhắn để nhảy tới');
    clearJump();
  }, [jumpTarget, messages, hasNextPage, isFetchingNextPage, fetchNextPage, scrollToMessage, clearJump]);

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
    <LightboxProvider>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 pb-2 pt-4"
        >
          {isFetchingNextPage && (
            <div className="py-2 text-center text-[11px] text-muted-foreground">Đang tải thêm...</div>
          )}

          <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const m = messages[virtualItem.index];
              if (!m) return null;
              const prev = messages[virtualItem.index - 1];
              const showAvatar = m.senderId !== meId && (!prev || prev.senderId !== m.senderId);
              const repliedTo = m.replyToMessageId ? messageById.get(m.replyToMessageId) ?? null : null;
              const repliedToName = repliedTo
                ? repliedTo.senderId === meId ? 'Bạn' : (memberNames[repliedTo.senderId] ?? null)
                : null;
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                    paddingBottom: '4px',
                  }}
                >
                  <MessageBubble
                    message={m}
                    meId={meId}
                    showAvatar={showAvatar}
                    senderName={memberNames[m.senderId] ?? null}
                    showSenderName={showSenderNames && showAvatar}
                    senderAvatarUrl={memberAvatars[m.senderId] ?? null}
                    senderSeed={m.senderId}
                    repliedTo={repliedTo}
                    repliedToName={repliedToName}
                    onQuoteClick={scrollToMessage}
                    isHighlighted={highlightId === m.id}
                    canPin={canPin}
                    isPinned={pinnedIds.has(m.id)}
                    leaderLabel={showLeaderBadges ? getLeaderLabel(memberRoles[m.senderId]) : null}
                  />
                </div>
              );
            })}
          </div>

          {sendError && (
            <div className="px-6 py-1.5 text-center text-[11.5px] text-danger/90">
              Gửi thất bại — {sendError}
            </div>
          )}
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
                senderAvatarUrl={memberAvatars[userId] ?? null}
              />
            );
          })}
        </div>

        {showScrollDown && (
          <button
            type="button"
            onClick={() => { scrollToBottom(); onAtBottom?.(); }}
            aria-label="Xuống tin mới nhất"
            className="absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-muted text-foreground transition-colors hover:bg-secondary"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>
    </LightboxProvider>
  );
}
