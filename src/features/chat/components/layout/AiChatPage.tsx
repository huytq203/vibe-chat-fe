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
    conversations, session, activeId, actions, select, startNew, remember, isLoading,
  } = useAiConversations({
    origin: 'CHAT',
    scope: 'chat',
  });
  const { remove, isDeleting } = useDeleteAiConversation();
  // Chỉ tự mở hội thoại gần nhất MỘT lần khi vào trang; sau khi người dùng bấm "+"
  // (activeId về null) không được tự chọn lại — trước đây effect này "nuốt" nút tạo mới.
  const autoPickedRef = useRef(false);

  // Chỉ phản ứng khi id TRÊN URL thực sự đổi (vào trang, back/forward, link) — không so
  // với activeId: sau lượt đầu `remember` gán activeId trước rồi URL mới đổi theo (select
  // lại sẽ nháy về trống), còn bấm "+" thì activeId về null trước khi URL kịp về /ai
  // (so với activeId sẽ chọn lại hội thoại cũ → phải bấm hai lần).
  const handledRouteIdRef = useRef<string | null | undefined>(undefined);
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => {
    if (handledRouteIdRef.current === routeActiveId) return;
    handledRouteIdRef.current = routeActiveId;
    if (routeActiveId && routeActiveId !== activeIdRef.current) select(routeActiveId);
  }, [routeActiveId, select]);

  const handleSelect = useCallback((id: string): void => {
    handledRouteIdRef.current = id;
    select(id);
    setRouteActiveId(id);
  }, [select, setRouteActiveId]);

  const handleStartNew = useCallback((): void => {
    autoPickedRef.current = true;
    // Đánh dấu id đang có trên URL là "đã xử lý" để effect không chọn lại nó trước khi URL về /ai.
    handledRouteIdRef.current = routeActiveId;
    startNew();
    setRouteActiveId(null);
  }, [routeActiveId, setRouteActiveId, startNew]);

  const handleRemember = useCallback((conversationId: string): void => {
    handledRouteIdRef.current = conversationId;
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
          isLoading={isLoading}
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
