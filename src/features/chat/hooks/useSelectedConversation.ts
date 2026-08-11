'use client';

import { useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';

export function useSelectedConversation() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const routeConversationId = params.id ?? null;
  const pendingConversationId = useChatUIStore((s) => s.pendingConversationId);
  const pendingConversationRouteId = useChatUIStore((s) => s.pendingConversationRouteId);
  const setPendingConversation = useChatUIStore((s) => s.setPendingConversation);
  const clearPendingConversation = useChatUIStore((s) => s.clearPendingConversation);

  const pendingIsActive =
    pendingConversationId !== undefined &&
    routeConversationId === pendingConversationRouteId &&
    routeConversationId !== pendingConversationId;
  const selectedConversationId = pendingIsActive
    ? pendingConversationId
    : routeConversationId;

  useEffect(() => {
    if (pendingConversationId === undefined) return;

    const routeCommitted = routeConversationId === pendingConversationId;
    const anotherNavigationCommitted = routeConversationId !== pendingConversationRouteId;
    if (routeCommitted || anotherNavigationCommitted) clearPendingConversation();
  }, [
    clearPendingConversation,
    pendingConversationId,
    pendingConversationRouteId,
    routeConversationId,
  ]);

  const setSelected = useCallback(
    (id: string | null) => {
      setPendingConversation(id, routeConversationId);
      router.replace(id ? `/chat/${id}` : '/chat', { scroll: false });
    },
    [routeConversationId, router, setPendingConversation],
  );

  return { selectedConversationId, setSelected };
}
