'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSelectedAiSession } from '@/features/chat/hooks/useSelectedAiSession';
import { getJSON, setJSON } from '@/lib/storage/local-storage';

const KEY = 'ai-sessions';

export type AiAttachmentMeta = {
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string; // object URL — chỉ hợp lệ trong phiên hiện tại, không persist
  /**
   * base64 để gửi lại vẫn kèm được tệp thật. Giữ trong bộ nhớ, KHÔNG persist:
   * vài MB base64 sẽ làm vỡ quota localStorage của cả danh sách phiên.
   */
  data?: string;
};

/**
 * `failed` — tin của user, lượt gọi AI hỏng trước khi có chữ nào ⇒ hiện "Gửi lại / Sửa / Bỏ".
 * `incomplete` — tin của AI, stream đứt giữa chừng ⇒ giữ phần đã nhận, hiện "Gửi lại / Bỏ".
 */
export type AiMessageStatus = 'failed' | 'incomplete';

export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
  attachments?: AiAttachmentMeta[];
  status?: AiMessageStatus;
  /** Lý do hỏng, hiển thị ngay dưới bong bóng thay vì banner rời. */
  errorMessage?: string;
};
export type AiSession = { id: string; title: string; messages: AiMessage[]; updatedAt: number };

/** Thao tác ghi lên một phiên — truyền nguyên cụm xuống khung hội thoại. */
export type AiSessionActions = {
  createSession: () => string;
  pushMessage: (sessionId: string, message: AiMessage) => void;
  dropLastAssistant: (sessionId: string) => AiMessage[];
  markLastUserFailed: (sessionId: string, reason: string) => void;
  prepareResend: (sessionId: string, index: number) => AiMessage[];
  removeMessage: (sessionId: string, index: number) => AiMessage | null;
};

function load(): AiSession[] {
  return getJSON<AiSession[]>(KEY, []);
}

function persist(sessions: AiSession[]): void {
  const clean = sessions.map((s) => ({
    ...s,
    messages: s.messages.map((m) => ({
      ...m,
      attachments: m.attachments?.map(
        (a): Omit<AiAttachmentMeta, 'previewUrl' | 'data'> => ({
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

function lastUserIndex(messages: AiMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return i;
  }
  return -1;
}

function clearFailure(message: AiMessage): AiMessage {
  const next = { ...message };
  delete next.status;
  delete next.errorMessage;
  return next;
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

  /** Ghi theo `prev` để lượt gọi AI đang chờ không dùng snapshot cũ của `sessions`. */
  const commit = useCallback(
    (sessionId: string, next: (messages: AiMessage[]) => AiMessage[]): void => {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId ? { ...s, messages: next(s.messages) } : s,
        );
        persist(updated);
        return updated;
      });
    },
    [],
  );

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

  /** Bỏ câu trả lời cuối của AI để chạy lại; trả về danh sách tin nhắn còn lại. */
  const dropLastAssistant = useCallback(
    (sessionId: string): AiMessage[] => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return [];
      if (session.messages[session.messages.length - 1]?.role !== 'assistant') {
        return session.messages;
      }
      const messages = session.messages.slice(0, -1);
      commit(sessionId, () => messages);
      return messages;
    },
    [sessions, commit],
  );

  const markLastUserFailed = useCallback(
    (sessionId: string, reason: string): void => {
      commit(sessionId, (messages) => {
        const index = lastUserIndex(messages);
        if (index < 0) return messages;
        return messages.map((m, i) =>
          i === index ? { ...m, status: 'failed' as const, errorMessage: reason } : m,
        );
      });
    },
    [commit],
  );

  /** Gỡ cờ lỗi ở tin `index` + cắt mọi tin sau nó; trả lịch sử để gọi lại AI. */
  const prepareResend = useCallback(
    (sessionId: string, index: number): AiMessage[] => {
      const session = sessions.find((s) => s.id === sessionId);
      const target = session?.messages[index];
      if (!session || !target) return [];
      const history = session.messages
        .slice(0, index + 1)
        .map((m, i) => (i === index ? clearFailure(m) : m));
      commit(sessionId, () => history);
      return history;
    },
    [sessions, commit],
  );

  /** Gỡ một tin khỏi phiên (Sửa / Bỏ); trả về tin vừa gỡ để đổ lại vào ô nhập. */
  const removeMessage = useCallback(
    (sessionId: string, index: number): AiMessage | null => {
      const target = sessions.find((s) => s.id === sessionId)?.messages[index];
      if (!target) return null;
      commit(sessionId, (messages) => messages.filter((_, i) => i !== index));
      return target;
    },
    [sessions, commit],
  );

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

  const actions = useMemo<AiSessionActions>(
    () => ({
      createSession,
      pushMessage,
      dropLastAssistant,
      markLastUserFailed,
      prepareResend,
      removeMessage,
    }),
    [createSession, pushMessage, dropLastAssistant, markLastUserFailed, prepareResend, removeMessage],
  );

  return { sessions, activeSession, activeId, setActiveId, deleteSession, actions };
}
