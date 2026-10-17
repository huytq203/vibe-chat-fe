'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import {
  aiConversationsApi,
  type AiConversationOrigin,
  type AiConversationSummary,
} from '@/services/ai-conversations.api';
import { aiConversationKeys } from '../lib/ai-conversation-keys';
import {
  NEW_CONVERSATION_TITLE,
  createDraftSession,
  createSessionActions,
} from '../lib/ai-session';
import {
  selectActiveConversation,
  useAiActiveConversationStore,
} from '../stores/ai-active-conversation.store';
import type { AiSession, AiSessionActions } from '../types';

type UseAiConversationsOptions = {
  origin?: AiConversationOrigin;
  scope: string;
  /** false: chỉ nhớ trong bộ nhớ — dùng khi nơi gọi đã có nguồn sự thật khác (URL). */
  persist?: boolean;
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
        // `current` (ref) chỉ cập nhật sau render; các updater gộp trong cùng một nhịp
        // (remember gán activeId rồi persist đẩy câu trả lời) thấy ref còn activeId=null.
        // Vì vậy so với bản nháp trước theo `previous`, không theo ref, và giữ nguyên
        // activeId của nó — nếu không, câu trả lời sẽ ghi vào một phiên rỗng và màn hình nháy.
        const hasLocalDraft = previous.scope === current.scope
          && previous.dirty
          && (previous.activeId === current.activeId || current.activeId === null);
        // Chỉ chặn khi KHÔNG có bản nháp cục bộ (đang tải detail của hội thoại vừa chọn).
        if (current.isDetailLoading && !hasLocalDraft) return previous;
        const source = hasLocalDraft ? previous.value : sessionRef.current;
        return {
          scope: current.scope,
          activeId: hasLocalDraft ? previous.activeId : current.activeId,
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
      ensurePendingUser: (id, message) =>
        getActions().ensurePendingUser?.(resolve(id), message),
      dropLastAssistant: (id) => getActions().dropLastAssistant(resolve(id)),
      markLastUserFailed: (id, reason) => getActions().markLastUserFailed(resolve(id), reason),
      prepareResend: (id, index) => getActions().prepareResend(resolve(id), index),
      removeMessage: (id, index) => getActions().removeMessage(resolve(id), index),
      alias: (draftId, conversationId) => { aliasRef.current.set(draftId, conversationId); },
    };
  }, [setLocal]);
}

const TITLE_REFRESH_DELAYS_MS = [2500, 7000] as const;

function isGone(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 403);
}

function useActiveConversation(
  scope: string,
  persist: boolean,
): [string | null, (scope: string, id: string | null) => void] {
  const persisted = useAiActiveConversationStore(selectActiveConversation(scope));
  const setPersisted = useAiActiveConversationStore((state) => state.setActive);
  const [inMemory, setInMemory] = useState<Record<string, string | null>>({});
  const setInMemoryActive = useCallback((key: string, id: string | null) => {
    setInMemory((current) => ({ ...current, [key]: id }));
  }, []);
  return persist
    ? [persisted, setPersisted]
    : [inMemory[scope] ?? null, setInMemoryActive];
}

export function useAiConversations({
  origin,
  scope,
  persist = true,
}: UseAiConversationsOptions): Result {
  const queryClient = useQueryClient();
  // Lưu ngoài component để đổi tab (unmount) hay tải lại trang không mất hội thoại đang mở.
  const [activeId, setActive] = useActiveConversation(scope, persist);
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
    retry: (count, error) => !isGone(error) && count < 1,
  });
  const isDetailGone = isGone(detail.error);
  useEffect(() => {
    // Hội thoại đã lưu bị xoá/mất quyền ở nơi khác → về phiên nháp thay vì kẹt ở trạng thái lỗi.
    if (activeId && isDetailGone) setActive(scope, null);
  }, [activeId, isDetailGone, scope, setActive]);
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
  const clearActive = useCallback(() => setActive(scope, null), [scope, setActive]);
  const actions = useStableActions(
    session,
    scope,
    activeId,
    setLocal,
    clearActive,
    isDetailLoading,
  );
  const select = useCallback((id: string) => {
    setActive(scope, id);
    setLocal({ scope, activeId: id, value: createDraftSession(id), dirty: false });
  }, [scope, setActive]);
  const startNew = useCallback(() => { actions.createSession(); }, [actions]);
  const remember = useCallback((conversationId: string) => {
    if (!activeId) {
      setActive(scope, conversationId);
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
  }, [actions, activeId, origin, queryClient, scope, session.id, setActive]);
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
    isError: list.isError || (detail.isError && !isDetailGone),
    select,
    startNew,
    remember,
    refetch,
  };
}
