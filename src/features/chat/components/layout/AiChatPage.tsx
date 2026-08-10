'use client';

import { useEffect, useState } from 'react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useSectionNav } from '@/features/chat/hooks/useSectionNav';
import { useAiSessions } from '@/features/chat/hooks/useAiSessions';
import { AiSessionList } from './AiSessionList';
import { AiChatMain } from './AiChatMain';

export function AiChatPage() {
  const isMobile = useIsMobile();
  const { goToSection } = useSectionNav();
  const [historyOpen, setHistoryOpen] = useState(true);
  const { sessions, activeSession, activeId, setActiveId, deleteSession, actions } = useAiSessions({
    routed: true,
  });

  // Desktop: vào /ai trống mà đã có session → mở session gần nhất (giống auto-chọn hội thoại
  // ở chat). Mobile chỉ có một cột nên giữ nguyên màn danh sách để người dùng tự chọn.
  useEffect(() => {
    if (isMobile || activeId) return;
    const first = sessions[0];
    if (first) setActiveId(first.id);
  }, [isMobile, activeId, sessions, setActiveId]);

  const showHistory = isMobile ? !activeId : historyOpen;
  const showConversation = !isMobile || Boolean(activeId);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden">
      {showHistory && (
        <AiSessionList
          sessions={sessions}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={actions.createSession}
          onDelete={deleteSession}
          onCollapse={isMobile ? undefined : () => setHistoryOpen(false)}
          onBack={isMobile ? () => goToSection('chat') : undefined}
        />
      )}

      {showConversation && (
        <AiChatMain
          session={activeSession}
          actions={actions}
          onDeleteSession={deleteSession}
          onBack={isMobile ? () => setActiveId(null) : undefined}
          onExpandSidebar={!isMobile && !historyOpen ? () => setHistoryOpen(true) : undefined}
        />
      )}
    </div>
  );
}
