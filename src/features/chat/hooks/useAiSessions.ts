'use client';

import { useCallback, useState } from 'react';

const KEY = 'ai-sessions';

export type AiMessage = { role: 'user' | 'assistant'; content: string };
export type AiSession = { id: string; title: string; messages: AiMessage[]; updatedAt: number };

function load(): AiSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as AiSession[];
  } catch {
    return [];
  }
}

function persist(sessions: AiSession[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 50)));
  } catch {
    // localStorage không khả dụng
  }
}

function getInitialSessions(): AiSession[] {
  return load();
}

function getInitialActiveId(sessions: AiSession[]): string | null {
  return sessions[0]?.id ?? null;
}

export function useAiSessions() {
  const [sessions, setSessions] = useState<AiSession[]>(getInitialSessions);
  const [activeId, setActiveId] = useState<string | null>(() =>
    getInitialActiveId(getInitialSessions()),
  );

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
  }, []);

  const pushMessage = useCallback((sessionId: string, message: AiMessage): void => {
    setSessions((prev) => {
      const next = prev.map((s) => {
        if (s.id !== sessionId) return s;
        const messages = [...s.messages, message];
        const title =
          s.messages.length === 0 && message.role === 'user'
            ? message.content.slice(0, 40)
            : s.title;
        return { ...s, messages, title, updatedAt: Date.now() };
      });
      persist(next);
      return next;
    });
  }, []);

  const deleteSession = useCallback((id: string): void => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persist(next);
      return next;
    });
    setActiveId((prevId) => {
      if (prevId !== id) return prevId;
      const remaining = load().filter((s) => s.id !== id);
      return remaining[0]?.id ?? null;
    });
  }, []);

  return { sessions, activeSession, activeId, setActiveId, createSession, pushMessage, deleteSession };
}
