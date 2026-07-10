'use client';

import { useCallback, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useSelectedConversation } from '@/features/chat/hooks/useSelectedConversation';
import { useConversation, usePresence } from '@/features/chat/hooks/use-query';
import { useMarkRead } from '@/features/chat/hooks/use-mutations';
import { ChatHeader } from './ChatHeader';
import { CallBanner } from '@/features/call';
import { ConvLockScreen } from './ConvLockScreen';
import { MessageList } from '@/features/chat/components/messages/MessageList';
import { MessageInput } from '@/features/chat/components/messages/MessageInput';
import { PinnedBanner } from '@/features/chat/components/messages/PinnedBanner';
import { useConvLockStore } from '@/features/chat/stores/conv-lock.store';
import { canSendMessage } from '@/features/chat/utils';
import { useWallpaper } from '@/features/chat/hooks/useWallpaper';
import { cn } from '@/lib/utils/cn';

export function ChatPanel() {
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const rightPanelOpen = useChatUIStore((s) => s.rightPanelOpen);
  const toggleRight = useChatUIStore((s) => s.toggleRight);
  const setMobilePanel = useChatUIStore((s) => s.setMobilePanel);
  const mobilePanel = useChatUIStore((s) => s.mobilePanel);
  const isMobile = useIsMobile();
  const { selectedConversationId } = useSelectedConversation();
  const { data: conversation } = useConversation(selectedConversationId);
  const { mutate: markRead } = useMarkRead();
  const lastReadRef = useRef<string | null>(null);
  const relock = useConvLockStore((s) => s.relock);

  // Chỉ conv ĐANG MỞ được giữ mở khoá; mọi conv khác khoá lại → rời ra vào lại phải nhập
  // lại. Đọc trực tiếp store (không dùng ref cục bộ) vì ChatPanel remount khi đổi route
  // /chat/[id] sẽ làm mất ref.
  useEffect(() => {
    const unlocked = useConvLockStore.getState().unlockedIds;
    unlocked.forEach((id) => {
      if (id !== selectedConversationId) relock(id);
    });
  }, [selectedConversationId, relock]);

  // Mobile: quay về danh sách cũng là rời conversation → khoá lại conv đang mở.
  useEffect(() => {
    if (isMobile && mobilePanel === 'list' && selectedConversationId) {
      relock(selectedConversationId);
    }
  }, [isMobile, mobilePanel, selectedConversationId, relock]);

  // Subscribe vào unlockedIds (state) — KHÔNG phải method isUnlocked (ref cố định),
  // để markUnlocked() trigger re-render mở khoá ngay, không phải đợi re-render khác.
  const unlockedIds = useConvLockStore((s) => s.unlockedIds);
  const isLocked =
    conversation != null &&
    Boolean(conversation.isLocked) &&
    !unlockedIds.has(conversation.id);

  const convId = conversation?.id ?? null;
  const lastMessageId = conversation?.lastMessage?.id ?? null;
  const unreadCount = conversation?.unreadCount ?? 0;

  // Chỉ đánh dấu đã đọc khi nội dung thực sự hiển thị (đã mở khoá). Nếu fire lúc còn
  // khoá, lastReadRef bị "đầu độc" → sau khi mở khoá sẽ không mark-read lại được.
  useEffect(() => {
    if (isLocked) return;
    if (!convId || !lastMessageId || unreadCount <= 0) return;
    const key = `${convId}:${lastMessageId}`;
    if (lastReadRef.current === key) return;

    let done = false;
    const fire = () => {
      if (done) return;
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      done = true;
      lastReadRef.current = key;
      markRead({ conversationId: convId, messageId: lastMessageId });
    };

    fire();
    if (done) return;

    document.addEventListener('visibilitychange', fire);
    window.addEventListener('focus', fire);
    return () => {
      document.removeEventListener('visibilitychange', fire);
      window.removeEventListener('focus', fire);
    };
  }, [convId, lastMessageId, unreadCount, markRead, isLocked]);

  const otherIds = conversation && conversation.type === 'DIRECT'
    ? conversation.memberIds.filter((id) => id !== meId)
    : [];
  const { data: presenceList } = usePresence(otherIds);
  const otherPresence = presenceList?.[0] ?? null;

  const isSelfConv = conversation?.type === 'SELF';
  const wallpaperStyle = useWallpaper(selectedConversationId);
  const wallpaperActive = Object.keys(wallpaperStyle).length > 0;

  // Gọi khi user scroll đến cuối hoặc khi click scroll-down button.
  const handleAtBottom = useCallback(() => {
    if (!convId || !lastMessageId || unreadCount <= 0) return;
    markRead({ conversationId: convId, messageId: lastMessageId });
  }, [convId, lastMessageId, unreadCount, markRead]);

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

  const convName = conversation.name ??
    conversation.members?.find((m) => m.userId !== meId)?.displayName ??
    'Cuộc trò chuyện';

  return (
    <main
      style={wallpaperStyle}
      className={cn('flex h-full min-w-0 flex-1 flex-col gap-3', !wallpaperActive && 'bg-background')}
    >
      <ChatHeader
        conversation={conversation}
        meId={meId}
        presence={otherPresence}
        rightOpen={rightPanelOpen}
        onToggleRight={isMobile ? () => setMobilePanel('contact') : toggleRight}
        onBack={isMobile ? () => setMobilePanel('list') : undefined}
        wallpaperActive={wallpaperActive}
      />
      <CallBanner />
      {isLocked ? (
        <ConvLockScreen conversationId={conversation.id} name={convName} />
      ) : (
        <>
          <PinnedBanner conversation={conversation} meId={meId} />
          <MessageList key={conversation.id} conversationId={conversation.id} onAtBottom={handleAtBottom} wallpaperActive={wallpaperActive} />
          {isSelfConv || canSendMessage(conversation, meId) ? (
            <MessageInput
              conversationId={conversation.id}
              selfConv={isSelfConv}
              isGroup={conversation.type === 'GROUP' || conversation.type === 'CHANNEL'}
              wallpaperActive={wallpaperActive}
            />
          ) : (
            <div className={cn('shrink-0 rounded-2xl px-4 py-3 text-center text-[12.5px] text-muted-foreground shadow-subtle', wallpaperActive ? 'bg-sidebar/75 backdrop-blur-md' : 'bg-sidebar')}>
              Chỉ quản trị viên được nhắn trong nhóm này
            </div>
          )}
        </>
      )}
    </main>
  );
}
