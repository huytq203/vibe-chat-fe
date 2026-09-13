'use client';

import { useCallback, useEffect, useState } from 'react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useSectionNav } from '@/features/chat/hooks/useSectionNav';
import { useSelectedAiSession } from '@/features/chat/hooks/useSelectedAiSession';
import { useAiConversations } from '@/features/ai/hooks/useAiConversations';
import { aiConversationsApi } from '@/services/ai-conversations.api';
import { AiSessionList } from './AiSessionList';
import { AiChatMain } from './AiChatMain';

export function AiChatPage() {
  const isMobile = useIsMobile();
  const { goToSection } = useSectionNav();
  const { activeId: routeActiveId, setActiveId: setRouteActiveId } = useSelectedAiSession();
  const [historyOpen, setHistoryOpen] = useState(true);
  const {
    conversations, session, activeId, actions, select, startNew, remember, refetch,
  } = useAiConversations({
    origin: 'CHAT',
    scope: 'chat',
  });

  useEffect(() => {
    if (routeActiveId) select(routeActiveId);
  }, [routeActiveId, select]);

  const handleSelect = useCallback((id: string): void => {
    select(id);
    setRouteActiveId(id);
  }, [select, setRouteActiveId]);

  const handleStartNew = useCallback((): void => {
    startNew();
    setRouteActiveId(null);
  }, [setRouteActiveId, startNew]);

  const handleRemember = useCallback((conversationId: string): void => {
    remember(conversationId);
    setRouteActiveId(conversationId);
  }, [remember, setRouteActiveId]);

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    await aiConversationsApi.remove(id);
    if (activeId === id) handleStartNew();
    refetch();
  }, [activeId, handleStartNew, refetch]);

  // Desktop: vào /ai trống mà đã có session → mở session gần nhất (giống auto-chọn hội thoại
  // ở chat). Mobile chỉ có một cột nên giữ nguyên màn danh sách để người dùng tự chọn.
  useEffect(() => {
    if (isMobile || activeId) return;
    const first = conversations[0];
    if (first) handleSelect(first.id);
  }, [isMobile, activeId, conversations, handleSelect]);

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
