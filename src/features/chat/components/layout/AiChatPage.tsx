'use client';

import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useAiSessions } from '@/features/chat/hooks/useAiSessions';
import { useAiSettings } from '@/features/chat/hooks/useAiSettings';
import { AiSessionList } from './AiSessionList';
import { AiChatMain } from './AiChatMain';

export function AiChatPage() {
  const setActiveSection = useChatUIStore((s) => s.setActiveSection);
  const {
    sessions,
    activeSession,
    activeId,
    setActiveId,
    createSession,
    pushMessage,
    deleteSession,
  } = useAiSessions();
  const { settings, saveSettings } = useAiSettings();

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
        settings={settings}
        onSaveSettings={saveSettings}
        onPushMessage={pushMessage}
        onBack={() => setActiveSection('chat')}
        onCreateSession={createSession}
      />
    </div>
  );
}
