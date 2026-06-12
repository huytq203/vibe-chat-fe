'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth';
import { useConversation, useMessages } from '@/features/chat/hooks/use-query';
import { useSelfDestruct } from '@/features/chat/hooks/useSelfDestruct';
import { useTypingStore } from '@/features/chat/stores/typing.store';
import { useMessageJumpStore } from '@/features/chat/stores/message-jump.store';
import { useSendErrorStore } from '@/features/chat/stores/send-error.store';
import type { Message } from '@/features/chat/types';
import { buildMemberAvatarMap, buildMemberNameMap } from '@/features/chat/utils';
import { MessageBubble } from './MessageBubble';
import { TypingBubble } from './TypingBubble';
import { LightboxProvider } from './LightboxProvider';

type MessageListProps = {
  conversationId: string;
};

const EMPTY_TYPING: string[] = [];
/** Trần số trang tự nạp khi nhảy tới 1 tin cũ (40 × 30 ≈ 1200 tin) — tránh nạp vô hạn. */
const MAX_JUMP_FETCHES = 40;

export function MessageList({ conversationId }: MessageListProps) {
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const { data: conversation } = useConversation(conversationId);
  const memberNames = useMemo(() => buildMemberNameMap(conversation), [conversation]);
  const memberAvatars = useMemo(() => buildMemberAvatarMap(conversation), [conversation]);
  // Group/Channel: hiện tên người gửi trên tin đầu mỗi chuỗi để biết ai gửi.
  const showSenderNames = conversation ? conversation.type !== 'DIRECT' : false;
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

  // Tra nhanh tin gốc của một reply (chỉ trong các trang đã load).
  const messageById = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages],
  );

  // Tin tự huỷ: hẹn timer ẩn theo expireAt (không chờ server xoá nền).
  useSelfDestruct(conversationId, messages);

  // Lỗi gửi (chặn, mất kết nối...) — hiện như thông báo hệ thống ở cuối danh sách.
  const sendError = useSendErrorStore((s) => s.byConv[conversationId]);

  const typingUserIds = useTypingStore(
    (s) => s.byConv[conversationId] ?? EMPTY_TYPING,
  );
  const otherTypingIds = useMemo(
    () => typingUserIds.filter((id) => id !== meId),
    [typingUserIds, meId],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setShowScrollDown(false);
  }, []);

  // Bấm khối trích dẫn → cuộn tới tin gốc + nháy sáng. Ngoài khung nhìn → toast.
  const scrollToMessage = useCallback((messageId: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    );
    if (!el) {
      toast('Tin nhắn gốc không còn trong khung nhìn');
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightId(null), 1600);
  }, []);

  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);

  // Nhảy tới tin từ panel ngoài (kết quả tìm kiếm): nếu tin chưa nạp, tự tải dần các
  // trang cũ hơn tới khi tin có trong khung rồi cuộn + nháy sáng. Drive trực tiếp từ
  // store target (không mirror sang state) — counter giữ ở ref để chặn nạp vô hạn.
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
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${jumpTarget.id}"]`,
    );
    if (el) {
      scrollToMessage(jumpTarget.id);
      clearJump();
      return;
    }
    if (isFetchingNextPage) return; // chờ trang đang tải xong rồi kiểm tra lại
    // messages sắp xếp cũ → mới, messages[0] là tin cũ nhất đã nạp.
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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    if (!last || last.id === lastIdRef.current) return;
    lastIdRef.current = last.id;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Thông báo lỗi gửi xuất hiện → cuộn xuống cho user thấy ngay.
  useEffect(() => {
    if (!sendError) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sendError]);

  useEffect(() => {
    if (otherTypingIds.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [otherTypingIds.length]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (hasNextPage && !isFetchingNextPage && el.scrollTop <= 40) void fetchNextPage();
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distanceFromBottom > 240);
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
    <LightboxProvider>
    <div className="relative flex min-h-0 flex-1 flex-col">
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-5 pb-2 pt-4"
    >
      <div className="flex min-h-full flex-col justify-end space-y-1">
      {isFetchingNextPage && (
        <div className="py-2 text-center text-[11px] text-muted-foreground">Đang tải thêm...</div>
      )}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const showAvatar = m.senderId !== meId && (!prev || prev.senderId !== m.senderId);
        const repliedTo = m.replyToMessageId ? messageById.get(m.replyToMessageId) ?? null : null;
        const repliedToName = repliedTo
          ? repliedTo.senderId === meId
            ? 'Bạn'
            : memberNames[repliedTo.senderId] ?? null
          : null;
        return (
          <MessageBubble
            key={m.id}
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
          />
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
            userId={userId}
            showAvatar={showAvatar}
            senderName={memberNames[userId] ?? null}
            senderAvatarUrl={memberAvatars[userId] ?? null}
          />
        );
      })}
      </div>
    </div>

      {showScrollDown && (
        <button
          type="button"
          onClick={scrollToBottom}
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
