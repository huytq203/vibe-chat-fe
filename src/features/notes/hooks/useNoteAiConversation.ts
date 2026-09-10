'use client';

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type Dispatch, type SetStateAction,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AiSession, AiSessionActions } from '@/features/ai';
import { registerAiConversationPersistence } from '@/features/ai/lib/run-ai-conversation';
import { createNoteAiSessionActions } from '@/features/notes/lib/ai-session';
import {
  createDraftSession, persistNoteAiTurn, toAiSession,
} from '@/features/notes/lib/note-ai-history';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { ApiError } from '@/lib/api/client';
import { notionKeys } from '@/services/keys';
import { notionAiHistoryApi, type ConversationSummary } from '@/services/notion-ai-history.api';

type Result = {
  conversations: ConversationSummary[]; activeId: string | null; session: AiSession;
  actions: AiSessionActions; isLoading: boolean; isError: boolean;
  select: (id: string) => void; startNew: () => void;
};
type LocalSession = { workspaceId: string; activeId: string | null; value: AiSession; dirty: boolean };
type SetActiveId = (workspaceId: string, conversationId: string | null) => void;

function useStableActions(
  session: AiSession, workspaceId: string, activeId: string | null,
  setLocal: Dispatch<SetStateAction<LocalSession>>,
  setActiveId: SetActiveId,
  isActiveConversationLoading: boolean,
): AiSessionActions {
  const sessionRef = useRef(session);
  const scopeRef = useRef({ workspaceId, activeId });
  const loadingRef = useRef(isActiveConversationLoading);
  const settersRef = useRef({ setLocal, setActiveId });
  useEffect(() => {
    sessionRef.current = session;
    scopeRef.current = { workspaceId, activeId };
    loadingRef.current = isActiveConversationLoading;
    settersRef.current = { setLocal, setActiveId };
  }, [activeId, isActiveConversationLoading, session, setActiveId, setLocal, workspaceId]);
  return useMemo<AiSessionActions>(() => {
    const getActions = (): AiSessionActions => createNoteAiSessionActions({ sessionRef,
      update: (updater) => settersRef.current.setLocal((previous) => {
        if (loadingRef.current) return previous;
        const current = scopeRef.current;
        const source = previous.workspaceId === current.workspaceId
          && previous.activeId === current.activeId
          ? previous.value : sessionRef.current;
        return { workspaceId: current.workspaceId, activeId: current.activeId,
          value: updater(source), dirty: true }; }),
      reset: () => { const next = createDraftSession(scopeRef.current.workspaceId);
        settersRef.current.setActiveId(scopeRef.current.workspaceId, null);
        settersRef.current.setLocal({ workspaceId: scopeRef.current.workspaceId, activeId: null,
          value: next, dirty: true }); return next; } });
    return { createSession: () => getActions().createSession(),
      pushMessage: (id, message) => {
        if (!loadingRef.current) getActions().pushMessage(id, message);
      },
      dropLastAssistant: (id) => getActions().dropLastAssistant(id),
      markLastUserFailed: (id, reason) => getActions().markLastUserFailed(id, reason),
      prepareResend: (id, index) => getActions().prepareResend(id, index),
      removeMessage: (id, index) => getActions().removeMessage(id, index) };
  }, []);
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function useNoteAiConversation(workspaceId: string, pageId: string): Result {
  const qc = useQueryClient();
  const activeId = useNotesUiStore(
    (state) => state.aiConversationByWorkspace[workspaceId] ?? null,
  );
  const setActiveId = useNotesUiStore((state) => state.setAiConversation);
  const [local, setLocal] = useState<LocalSession>(
    { workspaceId, activeId: null, value: createDraftSession(workspaceId), dirty: true },
  );
  const list = useQuery({ queryKey: notionKeys.aiConversations(workspaceId),
    queryFn: () => notionAiHistoryApi.list(workspaceId), enabled: Boolean(workspaceId) });
  const detail = useQuery({ queryKey: notionKeys.aiConversation(activeId ?? ''),
    queryFn: () => notionAiHistoryApi.detail(activeId ?? ''), enabled: Boolean(activeId) });
  const detailNotFound = isNotFound(detail.error);
  useEffect(() => {
    if (!activeId || !detailNotFound) return;
    setActiveId(workspaceId, null);
  }, [activeId, detailNotFound, setActiveId, workspaceId]);
  const scoped = local.workspaceId === workspaceId && local.activeId === activeId ? local : null;
  const summary = list.data?.find(({ id }) => id === activeId);
  const session = scoped?.dirty || !detail.data
    ? (scoped?.value ?? createDraftSession(workspaceId))
    : toAiSession(detail.data, summary?.updatedAt);
  const isLoading = list.isPending || (Boolean(activeId) && detail.isPending);
  const isActiveConversationLoading = Boolean(activeId) && detail.isPending;
  const actions = useStableActions(
    session, workspaceId, activeId, setLocal, setActiveId, isActiveConversationLoading,
  );
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => registerAiConversationPersistence(actions, {
    persist: (user, result) => persistNoteAiTurn(
      { workspaceId, pageId, activeId, queryClient: qc }, user, result,
    ),
    onPersisted: (id) => {
      setActiveId(workspaceId, id);
      if (!mountedRef.current) return;
      setLocal((previous) => ({ workspaceId, activeId: id,
        value: { ...(previous.workspaceId === workspaceId ? previous.value : session), id },
        dirty: true }));
    },
    isMounted: () => mountedRef.current,
  }), [actions, activeId, pageId, qc, session, setActiveId, workspaceId]);
  const select = useCallback((id: string) => { setActiveId(workspaceId, id);
    setLocal({ workspaceId, activeId: id, value: createDraftSession(id), dirty: false });
  }, [setActiveId, workspaceId]);
  const startNew = useCallback(() => { actions.createSession(); }, [actions]);
  return { conversations: list.data ?? [], activeId, session, actions,
    isLoading,
    isError: list.isError || (detail.isError && !detailNotFound),
    select, startNew };
}
