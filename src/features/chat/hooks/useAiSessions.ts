'use client';

import { useCallback, useState } from 'react';
import { useSelectedAiSession } from '@/features/chat/hooks/useSelectedAiSession';
import { getJSON, setJSON } from '@/lib/storage/local-storage';

const KEY = 'ai-sessions';

export type AiAttachmentMeta = {
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string; // object URL — chỉ hợp lệ trong phiên hiện tại, không persist
};

export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AiAttachmentMeta[];
};
export type AiSession = { id: string; title: string; messages: AiMessage[]; updatedAt: number };

function load(): AiSession[] {
  return getJSON<AiSession[]>(KEY, []);
}

function persist(sessions: AiSession[]): void {
  const clean = sessions.map((s) => ({
    ...s,
    messages: s.messages.map((m) => ({
      ...m,
      attachments: m.attachments?.map(
        (a): Omit<AiAttachmentMeta, 'previewUrl'> => ({
          name: a.name,
          mimeType: a.mimeType,
          size: a.size,
        }),
      ),
    })),
  }));
  setJSON(KEY, clean.slice(0, 50));
}

function getInitialSessions(): AiSession[] {
  return load();
}

type UseAiSessionsOptions = {
  /** true → activeId đồng bộ URL /ai/[id] (trang AI full). false → state cục bộ (panel AI trong chat). */
  routed?: boolean;
};

export function useAiSessions(options?: UseAiSessionsOptions) {
  const [sessions, setSessions] = useState<AiSession[]>(getInitialSessions);
  const [localActiveId, setLocalActiveId] = useState<string | null>(
    () => getInitialSessions()[0]?.id ?? null,
  );
  const routed = useSelectedAiSession();

  const activeId = options?.routed ? routed.activeId : localActiveId;
  const setActiveId: (id: string | null) => void = options?.routed
    ? routed.setActiveId
    : setLocalActiveId;

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const createSession = useCallback((): string => {
    const id = crypto.randomUUID();
    const session: AiSession = {
      id,
      title: 'Cuộc trò chuyện mới',
      messages: [],
      updatedAt: Date.now(),
    };
    setSessions((prev) => {
      const next = [session, ...prev];
      persist(next);
      return next;
    });
    setActiveId(id);
    return id;
  }, [setActiveId]);

  const pushMessage = useCallback((sessionId: string, message: AiMessage): void => {
    setSessions((prev) => {
      const next = prev.map((s) => {
        if (s.id !== sessionId) return s;
        const messages = [...s.messages, message];
        const title =
          s.messages.length === 0 && message.role === 'user'
            ? (message.content.slice(0, 40) || message.attachments?.[0]?.name || 'Cuộc trò chuyện mới')
            : s.title;
        return { ...s, messages, title, updatedAt: Date.now() };
      });
      persist(next);
      return next;
    });
  }, []);

  const deleteSession = useCallback(
    (id: string): void => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        persist(next);
        return next;
      });
      if (activeId !== id) return;
      const remaining = load().filter((s) => s.id !== id);
      setActiveId(remaining[0]?.id ?? null);
    },
    [activeId, setActiveId],
  );

  return { sessions, activeSession, activeId, setActiveId, createSession, pushMessage, deleteSession };
}
