'use client';

import { useEffect } from 'react';
import { useSectionNav } from '@/features/chat/hooks/useSectionNav';
import { useAiSessions } from '@/features/chat/hooks/useAiSessions';
import { AiSessionList } from './AiSessionList';
import { AiChatMain } from './AiChatMain';

export function AiChatPage() {
  const { goToSection } = useSectionNav();
  const {
    sessions,
    activeSession,
    activeId,
    setActiveId,
    createSession,
    pushMessage,
    deleteSession,
  } = useAiSessions({ routed: true });

  // Vào /ai trống mà đã có session → chọn session gần nhất (giống auto-chọn hội thoại ở chat).
  useEffect(() => {
    if (activeId) return;
    const first = sessions[0];
    if (first) setActiveId(first.id);
  }, [activeId, sessions, setActiveId]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <AiSessionList
        sessions={sessions}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={createSession}
        onDelete={deleteSession}
      />
      <AiChatMain
        session={activeSession}
        onPushMessage={pushMessage}
        onBack={() => goToSection('chat')}
        onCreateSession={createSession}
      />
    </div>
  );
}
