'use client';

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  aiConversationsApi,
  type AiConversationOrigin,
  type AiConversationSummary,
} from '@/services/ai-conversations.api';
import { aiConversationKeys } from '../lib/ai-conversation-keys';
import type { AiMessage, AiSession, AiSessionActions } from '../types';

const NEW_CONVERSATION_TITLE = 'Cuộc trò chuyện mới';

type UseAiConversationsOptions = {
  origin?: AiConversationOrigin;
  scope: string;
};

type LocalSession = {
  scope: string;
  activeId: string | null;
  value: AiSession;
  dirty: boolean;
};

type Result = {
  conversations: AiConversationSummary[];
  activeId: string | null;
  session: AiSession;
  actions: AiSessionActions;
  isLoading: boolean;
  isError: boolean;
  select: (id: string) => void;
  startNew: () => void;
  remember: (conversationId: string) => void;
  refetch: () => void;
};

function createDraftSession(scope: string): AiSession {
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

type SessionAccess = {
  sessionRef: RefObject<AiSession>;
  update: (updater: (session: AiSession) => AiSession) => void;
  reset: () => AiSession;
};

function createSessionActions(access: SessionAccess): AiSessionActions {
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

function useStableActions(
  session: AiSession,
  scope: string,
  activeId: string | null,
  setLocal: Dispatch<SetStateAction<LocalSession>>,
  clearActive: () => void,
  isDetailLoading: boolean,
): AiSessionActions {
  const sessionRef = useRef(session);
  const stateRef = useRef({ scope, activeId, isDetailLoading, clearActive });
  // id nháp → id BE cấp sau lượt đầu: luồng stream vẫn gọi action bằng id nháp cũ,
  // nếu không ánh xạ thì câu trả lời bị bỏ qua (session.id đã đổi) và chỉ hiện sau khi tải lại.
  const aliasRef = useRef(new Map<string, string>());
  useLayoutEffect(() => {
    sessionRef.current = session;
    stateRef.current = { scope, activeId, isDetailLoading, clearActive };
  }, [activeId, clearActive, isDetailLoading, scope, session]);

  return useMemo(() => {
    const getActions = (): AiSessionActions => createSessionActions({
      sessionRef,
      update: (updater) => setLocal((previous) => {
        const current = stateRef.current;
        const hasLocalDraft = previous.scope === current.scope
          && previous.activeId === current.activeId
          && previous.dirty;
        // Chỉ chặn khi KHÔNG có bản nháp cục bộ: ngay sau lượt đầu, activeId vừa được gán nên
        // detail đang tải — nếu bỏ qua cập nhật lúc này thì câu trả lời/tin kế tiếp bị rơi.
        if (current.isDetailLoading && !hasLocalDraft) return previous;
        const source = hasLocalDraft ? previous.value : sessionRef.current;
        return {
          scope: current.scope,
          activeId: current.activeId,
          value: updater(source),
          dirty: true,
        };
      }),
      reset: () => {
        const next = createDraftSession(stateRef.current.scope);
        stateRef.current.clearActive();
        setLocal({
          scope: stateRef.current.scope,
          activeId: null,
          value: next,
          dirty: true,
        });
        return next;
      },
    });
    const resolve = (id: string): string => aliasRef.current.get(id) ?? id;
    return {
      createSession: () => getActions().createSession(),
      pushMessage: (id, message) => getActions().pushMessage(resolve(id), message),
      dropLastAssistant: (id) => getActions().dropLastAssistant(resolve(id)),
      markLastUserFailed: (id, reason) => getActions().markLastUserFailed(resolve(id), reason),
      prepareResend: (id, index) => getActions().prepareResend(resolve(id), index),
      removeMessage: (id, index) => getActions().removeMessage(resolve(id), index),
      alias: (draftId, conversationId) => { aliasRef.current.set(draftId, conversationId); },
    };
  }, [setLocal]);
}

const TITLE_REFRESH_DELAYS_MS = [2500, 7000] as const;

export function useAiConversations({ origin, scope }: UseAiConversationsOptions): Result {
  const queryClient = useQueryClient();
  const [activeByScope, setActiveByScope] = useState<Record<string, string | null>>({});
  const activeId = activeByScope[scope] ?? null;
  const [local, setLocal] = useState<LocalSession>({
    scope,
    activeId: null,
    value: createDraftSession(scope),
    dirty: true,
  });
  const list = useQuery({
    queryKey: aiConversationKeys.list(origin),
    queryFn: () => aiConversationsApi.list({ origin }),
  });
  const detail = useQuery({
    queryKey: aiConversationKeys.detail(activeId ?? ''),
    queryFn: () => aiConversationsApi.detail(activeId ?? ''),
    enabled: Boolean(activeId),
  });
  const scoped = local.scope === scope && local.activeId === activeId ? local : null;
  const summary = list.data?.find(({ id }) => id === activeId);
  const session = scoped?.dirty || !detail.data
    ? (scoped?.value ?? createDraftSession(scope))
    : {
        id: detail.data.id,
        title: detail.data.title ?? NEW_CONVERSATION_TITLE,
        messages: detail.data.messages.map(({ role, content, status, toolNames, attachments }) => ({
          role,
          content,
          ...(status ? { status: status === 'FAILED' ? 'failed' as const : 'incomplete' as const } : {}),
          ...(toolNames ? { toolNames } : {}),
          ...(attachments ? { attachments } : {}),
        })),
        updatedAt: summary ? Date.parse(summary.updatedAt) : 0,
      };
  const isDetailLoading = Boolean(activeId) && detail.isPending;
  const clearActive = useCallback(() => {
    setActiveByScope((current) => ({ ...current, [scope]: null }));
  }, [scope]);
  const actions = useStableActions(
    session,
    scope,
    activeId,
    setLocal,
    clearActive,
    isDetailLoading,
  );
  const select = useCallback((id: string) => {
    setActiveByScope((current) => ({ ...current, [scope]: id }));
    setLocal({ scope, activeId: id, value: createDraftSession(id), dirty: false });
  }, [scope]);
  const startNew = useCallback(() => { actions.createSession(); }, [actions]);
  const remember = useCallback((conversationId: string) => {
    if (!activeId) {
      setActiveByScope((current) => ({ ...current, [scope]: conversationId }));
      actions.alias?.(session.id, conversationId);
      setLocal((previous) => previous.scope === scope && previous.activeId === null
        ? {
            scope,
            activeId: conversationId,
            value: { ...previous.value, id: conversationId },
            dirty: true,
          }
        : previous);
    }
    void queryClient.invalidateQueries({ queryKey: aiConversationKeys.list(origin) });
    void queryClient.invalidateQueries({ queryKey: aiConversationKeys.detail(conversationId) });
    // BE đặt tiêu đề bằng một lượt model riêng SAU khi trả `done` → tải lại danh sách thêm
    // vài nhịp để tiêu đề xuất hiện ngay ở lượt đầu thay vì chờ tới lượt sau.
    for (const delay of TITLE_REFRESH_DELAYS_MS) {
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: aiConversationKeys.list(origin) });
      }, delay);
    }
  }, [actions, activeId, origin, queryClient, scope, session.id]);
  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: aiConversationKeys.list(origin) });
    if (activeId) {
      void queryClient.invalidateQueries({ queryKey: aiConversationKeys.detail(activeId) });
    }
  }, [activeId, origin, queryClient]);

  return {
    conversations: list.data ?? [],
    activeId,
    session,
    actions,
    isLoading: list.isPending || isDetailLoading,
    isError: list.isError || detail.isError,
    select,
    startNew,
    remember,
    refetch,
  };
}
