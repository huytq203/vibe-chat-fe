'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useSectionNav } from '@/features/chat/hooks/useSectionNav';
import { useSelectedAiSession } from '@/features/chat/hooks/useSelectedAiSession';
import { useAiConversations } from '@/features/ai/hooks/useAiConversations';
import { useDeleteAiConversation } from '@/features/ai/hooks/useDeleteAiConversation';
import { AiSessionList } from './AiSessionList';
import { AiChatMain } from './AiChatMain';

export function AiChatPage() {
  const isMobile = useIsMobile();
  const { goToSection } = useSectionNav();
  const { activeId: routeActiveId, setActiveId: setRouteActiveId } = useSelectedAiSession();
  const [historyOpen, setHistoryOpen] = useState(true);
  const {
    conversations, session, activeId, actions, select, startNew, remember,
  } = useAiConversations({
    origin: 'CHAT',
    scope: 'chat',
  });
  const { remove, isDeleting } = useDeleteAiConversation('CHAT');
  // Chỉ tự mở hội thoại gần nhất MỘT lần khi vào trang; sau khi người dùng bấm "+"
  // (activeId về null) không được tự chọn lại — trước đây effect này "nuốt" nút tạo mới.
  const autoPickedRef = useRef(false);

  useEffect(() => {
    if (routeActiveId) select(routeActiveId);
  }, [routeActiveId, select]);

  const handleSelect = useCallback((id: string): void => {
    select(id);
    setRouteActiveId(id);
  }, [select, setRouteActiveId]);

  const handleStartNew = useCallback((): void => {
    autoPickedRef.current = true;
    startNew();
    setRouteActiveId(null);
  }, [setRouteActiveId, startNew]);

  const handleRemember = useCallback((conversationId: string): void => {
    remember(conversationId);
    setRouteActiveId(conversationId);
  }, [remember, setRouteActiveId]);

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    if (activeId === id) handleStartNew();
    await remove(id);
  }, [activeId, handleStartNew, remove]);

  // Desktop: vào /ai trống mà đã có session → mở session gần nhất (giống auto-chọn hội thoại
  // ở chat). Mobile chỉ có một cột nên giữ nguyên màn danh sách để người dùng tự chọn.
  useEffect(() => {
    if (isMobile || activeId || routeActiveId || autoPickedRef.current) return;
    const first = conversations[0];
    if (!first) return;
    autoPickedRef.current = true;
    handleSelect(first.id);
  }, [isMobile, activeId, routeActiveId, conversations, handleSelect]);

  const showHistory = isMobile ? !activeId : historyOpen;
  const showConversation = !isMobile || Boolean(activeId);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 gap-3 overflow-hidden">
      {showHistory && (
        <AiSessionList
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelect}
          onCreate={handleStartNew}
          onDelete={(id) => void handleDelete(id)}
          isDeleting={isDeleting}
          onCollapse={isMobile ? undefined : () => setHistoryOpen(false)}
          onBack={isMobile ? () => goToSection('chat') : undefined}
        />
      )}

      {showConversation && (
        <AiChatMain
          session={session}
          activeId={activeId}
          actions={actions}
          remember={handleRemember}
          onStartNew={handleStartNew}
          onDeleteSession={(id) => void handleDelete(id)}
          onBack={isMobile ? handleStartNew : undefined}
          onExpandSidebar={!isMobile && !historyOpen ? () => setHistoryOpen(true) : undefined}
        />
      )}
    </div>
  );
}
