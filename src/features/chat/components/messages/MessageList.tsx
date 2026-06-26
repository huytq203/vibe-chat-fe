'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { isSameDay, isToday, isYesterday, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth';
import { useConversation, useMessages, usePinnedMessages } from '@/features/chat/hooks/use-query';
import { useChatScroll } from '@/features/chat/hooks/useChatScroll';
import { useSelfDestruct } from '@/features/chat/hooks/useSelfDestruct';
import { useTypingStore } from '@/features/chat/stores/typing.store';
import { useBubbleConfig } from '@/features/chat/hooks/useWallpaper';
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

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Hôm nay';
  if (isYesterday(date)) return 'Hôm qua';
  return format(date, 'dd/MM/yyyy', { locale: vi });
}

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border/60" />
      <span className="text-[11px] font-medium text-muted-foreground">{formatDateLabel(date)}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

type MessageListProps = {
  conversationId: string;
  onAtBottom?: () => void;
  wallpaperActive?: boolean;
};

const EMPTY_TYPING: string[] = [];
const MAX_JUMP_FETCHES = 40;

export function MessageList({ conversationId, onAtBottom, wallpaperActive = false }: MessageListProps) {
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

  // Mốc thời gian mount: tin có createdAt > mốc này = tin mới (đến sau khi mở) → animate
  // slide-in. Dùng state initializer (chạy 1 lần) thay vì đọc ref trong render (phá memo
  // của React Compiler + lệch 1 frame).
  const [mountAt] = useState(() => Date.now());

  const bubbleConfig = useBubbleConfig(conversationId);

  const sendError = useSendErrorStore((s) => s.byConv[conversationId]);
  const lastMessageId = messages[messages.length - 1]?.id ?? null;

  const typingUserIds = useTypingStore((s) => s.byConv[conversationId] ?? EMPTY_TYPING);
  const otherTypingIds = useMemo(
    () => typingUserIds.filter((id) => id !== meId),
    [typingUserIds, meId],
  );

  const { scrollRef, topSentinelRef, highlightId, showScrollDown, scrollToBottom, scrollToMessage, handleScroll } =
    useChatScroll({
      lastMessageId,
      hasNextPage: hasNextPage ?? false,
      isFetchingNextPage,
      fetchNextPage,
      onAtBottom,
    });

  // Scroll xuống khi gửi lỗi
  useEffect(() => {
    if (!sendError) return;
    scrollToBottom();
  }, [sendError, scrollToBottom]);

  // Scroll xuống khi có người đang gõ (nếu đang ở gần đáy)
  useEffect(() => {
    if (otherTypingIds.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) scrollToBottom();
  }, [otherTypingIds.length, scrollRef, scrollToBottom]);

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
      <div className="animate-in fade-in flex flex-1 items-center justify-center text-sm text-muted-foreground duration-200">
        Đang tải tin nhắn...
      </div>
    );
  }

  if (messages.length === 0 && otherTypingIds.length === 0) {
    return (
      <div className="animate-in fade-in flex flex-1 items-center justify-center text-sm text-muted-foreground duration-200">
        Hãy gửi tin nhắn đầu tiên 👋
      </div>
    );
  }

  return (
    <LightboxProvider>
      <div className="animate-in fade-in relative flex min-h-0 flex-1 flex-col duration-200">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 overflow-x-hidden flex-1 overflow-y-auto px-5 pb-2 pt-4"
        >
          {/* Sentinel: IntersectionObserver theo dõi để trigger load trang cũ hơn */}
          <div ref={topSentinelRef} style={{ height: 1 }} />

          {isFetchingNextPage && (
            <div className="py-2 text-center text-[11px] text-muted-foreground">Đang tải thêm...</div>
          )}

          {messages.map((m, idx) => {
            const prev = messages[idx - 1];
            const msgDate = new Date(m.createdAt);
            const showDateSep = !prev || !isSameDay(msgDate, new Date(prev.createdAt));
            const showAvatar = m.senderId !== meId && (!prev || prev.senderId !== m.senderId || showDateSep);
            const repliedTo = m.replyToMessageId ? messageById.get(m.replyToMessageId) ?? null : null;
            const repliedToName = repliedTo
              ? repliedTo.senderId === meId ? 'Bạn' : (memberNames[repliedTo.senderId] ?? null)
              : null;
            const isNew = msgDate.getTime() > mountAt;
            return (
              <div key={m.id}>
                {showDateSep && <DateSeparator date={msgDate} />}
                <div
                  data-msgid={m.id}
                  className={cn('pb-1', isNew && 'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-150')}
                >
                  <MessageBubble
                    message={m}
                    meId={meId}
                    showAvatar={showAvatar}
                    senderName={memberNames[m.senderId] ?? null}
                    showSenderName={showSenderNames && showAvatar}
                    senderAvatarUrl={memberAvatars[m.senderId] ?? null}
                    repliedTo={repliedTo}
                    repliedToName={repliedToName}
                    onQuoteClick={scrollToMessage}
                    isHighlighted={highlightId === m.id}
                    canPin={canPin}
                    isPinned={pinnedIds.has(m.id)}
                    leaderLabel={showLeaderBadges ? getLeaderLabel(memberRoles[m.senderId]) : null}
                    wallpaperActive={wallpaperActive}
                    bubbleConfig={bubbleConfig}
                  />
                </div>
              </div>
            );
          })}

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
