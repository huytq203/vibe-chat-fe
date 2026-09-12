'use client';

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type Dispatch, type SetStateAction,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AiSession, AiSessionActions } from '@/features/ai';
import { registerAiConversationPersistence } from '@/features/ai/lib/run-ai-conversation';
import { taskAiHistoryApi, type ConversationSummary } from '@/services/task-ai-history.api';
import { createTaskAiSessionActions } from '../lib/ai-session';
import {
  createTaskDraftSession,
  persistTaskAiTurn,
  taskAiScope,
  toTaskAiSession,
} from '../lib/task-ai-history';
import { taskKeys } from '../services/keys';
import { useTasksUIStore } from '../stores/tasks-ui.store';

type Result = {
  conversations: ConversationSummary[];
  activeId: string | null;
  session: AiSession;
  actions: AiSessionActions;
  isLoading: boolean;
  isError: boolean;
  select: (id: string) => void;
  startNew: () => void;
  refetch: () => void;
};

type LocalSession = {
  scope: string;
  activeId: string | null;
  value: AiSession;
  dirty: boolean;
};

type SetActiveId = (projectId: string, conversationId: string | null) => void;

function useStableActions(
  session: AiSession,
  scope: string,
  activeId: string | null,
  setLocal: Dispatch<SetStateAction<LocalSession>>,
  setActiveId: SetActiveId,
  isActiveConversationLoading: boolean,
): AiSessionActions {
  const sessionRef = useRef(session);
  const scopeRef = useRef({ scope, activeId });
  const loadingRef = useRef(isActiveConversationLoading);
  const settersRef = useRef({ setLocal, setActiveId });
  useEffect(() => {
    sessionRef.current = session;
    scopeRef.current = { scope, activeId };
    loadingRef.current = isActiveConversationLoading;
    settersRef.current = { setLocal, setActiveId };
  }, [activeId, isActiveConversationLoading, scope, session, setActiveId, setLocal]);

  return useMemo<AiSessionActions>(() => {
    const getActions = (): AiSessionActions => createTaskAiSessionActions({
      sessionRef,
      update: (updater) => settersRef.current.setLocal((previous) => {
        if (loadingRef.current) return previous;
        const current = scopeRef.current;
        const source = previous.scope === current.scope && previous.activeId === current.activeId
          ? previous.value
          : sessionRef.current;
        return {
          scope: current.scope,
          activeId: current.activeId,
          value: updater(source),
          dirty: true,
        };
      }),
      reset: () => {
        const next = createTaskDraftSession(scopeRef.current.scope);
        settersRef.current.setActiveId(scopeRef.current.scope, null);
        settersRef.current.setLocal({
          scope: scopeRef.current.scope,
          activeId: null,
          value: next,
          dirty: true,
        });
        return next;
      },
    });
    return {
      createSession: () => getActions().createSession(),
      pushMessage: (id, message) => {
        if (!loadingRef.current) getActions().pushMessage(id, message);
      },
      dropLastAssistant: (id) => getActions().dropLastAssistant(id),
      markLastUserFailed: (id, reason) => getActions().markLastUserFailed(id, reason),
      prepareResend: (id, index) => getActions().prepareResend(id, index),
      removeMessage: (id, index) => getActions().removeMessage(id, index),
    };
  }, []);
}

export function useTaskAiConversation(projectId?: string | null): Result {
  const queryClient = useQueryClient();
  const scope = taskAiScope(projectId);
  const activeId = useTasksUIStore(
    (state) => state.aiConversationByProjectId[scope] ?? null,
  );
  const setActiveId = useTasksUIStore((state) => state.setAiConversation);
  const [local, setLocal] = useState<LocalSession>({
    scope,
    activeId: null,
    value: createTaskDraftSession(scope),
    dirty: true,
  });
  const list = useQuery({
    queryKey: taskKeys.aiConversations(),
    queryFn: taskAiHistoryApi.list,
  });
  const detail = useQuery({
    queryKey: taskKeys.aiConversation(activeId ?? ''),
    queryFn: () => taskAiHistoryApi.detail(activeId ?? ''),
    enabled: Boolean(activeId),
  });
  const conversations = useMemo(
    () => (list.data ?? []).filter((conversation) =>
      conversation.projectId === (projectId ?? null)),
    [list.data, projectId],
  );
  const scoped = local.scope === scope && local.activeId === activeId ? local : null;
  const summary = conversations.find(({ id }) => id === activeId);
  const session = scoped?.dirty || !detail.data
    ? (scoped?.value ?? createTaskDraftSession(scope))
    : toTaskAiSession(detail.data, summary?.updatedAt);
  const isActiveConversationLoading = Boolean(activeId) && detail.isPending;
  const actions = useStableActions(
    session,
    scope,
    activeId,
    setLocal,
    setActiveId,
    isActiveConversationLoading,
  );
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => registerAiConversationPersistence(actions, {
    persist: (user, result) => persistTaskAiTurn(
      { projectId, activeId, queryClient }, user, result,
    ),
    onPersisted: (id) => {
      setActiveId(scope, id);
      if (!mountedRef.current) return;
      setLocal((previous) => ({
        scope,
        activeId: id,
        value: { ...(previous.scope === scope ? previous.value : session), id },
        dirty: true,
      }));
    },
    isMounted: () => mountedRef.current,
  }), [actions, activeId, projectId, queryClient, scope, session, setActiveId]);

  const select = useCallback((id: string) => {
    setActiveId(scope, id);
    setLocal({ scope, activeId: id, value: createTaskDraftSession(id), dirty: false });
  }, [scope, setActiveId, setLocal]);
  const startNew = useCallback(() => { actions.createSession(); }, [actions]);
  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.aiConversations() });
    if (activeId) {
      void queryClient.invalidateQueries({ queryKey: taskKeys.aiConversation(activeId) });
    }
  }, [activeId, queryClient]);

  return {
    conversations,
    activeId,
    session,
    actions,
    isLoading: list.isPending || isActiveConversationLoading,
    isError: list.isError || detail.isError,
    select,
    startNew,
    refetch,
  };
}
