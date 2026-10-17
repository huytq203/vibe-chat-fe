import type { RefObject } from 'react';
import type { AiMessage, AiSession, AiSessionActions } from '../types';

export const NEW_CONVERSATION_TITLE = 'Cuộc trò chuyện mới';

export function createDraftSession(scope: string): AiSession {
  return {
    id: `ai:${scope}`,
    title: NEW_CONVERSATION_TITLE,
    messages: [],
    updatedAt: Date.now(),
  };
}

function lastUserIndex(messages: AiMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') return index;
  }
  return -1;
}

function clearFailure(message: AiMessage): AiMessage {
  const next = { ...message };
  delete next.status;
  delete next.errorMessage;
  return next;
}

function isSamePendingUser(left: AiMessage | undefined, right: AiMessage): boolean {
  if (left?.role !== 'user' || right.role !== 'user' || left.content !== right.content) {
    return false;
  }
  const leftAttachments = left.attachments ?? [];
  const rightAttachments = right.attachments ?? [];
  return leftAttachments.length === rightAttachments.length
    && leftAttachments.every((attachment, index) => {
      const other = rightAttachments[index];
      return other?.name === attachment.name
        && other.mimeType === attachment.mimeType
        && other.size === attachment.size;
    });
}

export type SessionAccess = {
  sessionRef: RefObject<AiSession>;
  update: (updater: (session: AiSession) => AiSession) => void;
  reset: () => AiSession;
};

export function createSessionActions(access: SessionAccess): AiSessionActions {
  const replaceMessages = (sessionId: string, messages: AiMessage[]): void => {
    access.update((session) => session.id === sessionId ? { ...session, messages } : session);
  };

  return {
    createSession: () => access.reset().id,
    pushMessage: (sessionId, message) => {
      access.update((session) => {
        if (session.id !== sessionId) return session;
        const title = session.messages.length === 0 && message.role === 'user'
          ? (message.content.slice(0, 40) || message.attachments?.[0]?.name || NEW_CONVERSATION_TITLE)
          : session.title;
        return {
          ...session,
          title,
          messages: [...session.messages, message],
          updatedAt: Date.now(),
        };
      });
    },
    ensurePendingUser: (sessionId, message) => {
      access.update((session) => {
        if (session.id !== sessionId || isSamePendingUser(session.messages.at(-1), message)) {
          return session;
        }
        return {
          ...session,
          title: session.messages.length === 0
            ? (message.content.slice(0, 40)
              || message.attachments?.[0]?.name
              || NEW_CONVERSATION_TITLE)
            : session.title,
          messages: [...session.messages, message],
          updatedAt: Date.now(),
        };
      });
    },
    dropLastAssistant: (sessionId) => {
      const session = access.sessionRef.current;
      if (session.id !== sessionId) return [];
      if (session.messages.at(-1)?.role !== 'assistant') return session.messages;
      const messages = session.messages.slice(0, -1);
      replaceMessages(sessionId, messages);
      return messages;
    },
    markLastUserFailed: (sessionId, reason) => {
      const session = access.sessionRef.current;
      if (session.id !== sessionId) return;
      const index = lastUserIndex(session.messages);
      if (index < 0) return;
      replaceMessages(sessionId, session.messages.map((message, position) =>
        position === index ? { ...message, status: 'failed', errorMessage: reason } : message));
    },
    prepareResend: (sessionId, index) => {
      const session = access.sessionRef.current;
      if (session.id !== sessionId || !session.messages[index]) return [];
      const messages = session.messages.slice(0, index + 1)
        .map((message, position) => position === index ? clearFailure(message) : message);
      replaceMessages(sessionId, messages);
      return messages;
    },
    removeMessage: (sessionId, index) => {
      const session = access.sessionRef.current;
      const removed = session.id === sessionId ? session.messages[index] : undefined;
      if (!removed) return null;
      replaceMessages(sessionId, session.messages.filter((_, position) => position !== index));
      return removed;
    },
  };
}
