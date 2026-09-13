'use client';

import { useCallback, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';

export function useSelectedConversation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  // Nhiều section dùng segment động `[id]` (ví dụ `/ai/[id]`). Chỉ route `/chat`
  // mới được phép biến param đó thành chat conversation ID.
  const isChatRoute = pathname === '/chat' || pathname.startsWith('/chat/');
  const routeConversationId = isChatRoute ? (params.id ?? null) : null;
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
