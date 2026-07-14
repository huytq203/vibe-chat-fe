'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiAuth } from '@/lib/api/client';
import { getSocket, onEvent } from '@/lib/ws/socket';
import type { Message } from '@/features/chat/types';
import { patchMessage, removeMessage } from './store-mutation-helpers';
import { mapChatMessageToStore, upsertStoreMessage } from './store-realtime-helpers';

/** Đọc conversationId từ payload WS bất kỳ (socket là global → phải tự lọc). */
function convIdOf(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const id = (data as { conversationId?: unknown }).conversationId;
  return typeof id === 'string' ? id : undefined;
}

/** Đọc messageId từ payload `message:deleted` (BE bắn full Message hoặc chỉ {messageId}). */
function deletedIdOf(data: unknown): string | undefined {
  const d = data as { id?: unknown; messageId?: unknown };
  const id = typeof d.id === 'string' ? d.id : d.messageId;
  return typeof id === 'string' ? id : undefined;
}

/**
 * Realtime cho kho cá nhân (conversation SELF): join room + nghe message:new/edited/deleted,
 * chỉ áp dụng event của đúng selfConvId. Dùng chung cơ chế WS với chat.
 */
export function useMyStoreRealtime(selfConvId: string | null): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!selfConvId) return;
    const socket = getSocket(apiAuth.getToken());
    if (!socket) return;
    const s = socket;
    const convId = selfConvId; // const → giữ narrowing string trong các closure

    function join(): void {
      s.emit('conversation:join', { conversationId: convId });
    }
    join();
    s.on('connect', join); // re-join sau reconnect (room mất khi kết nối mới)

    const unsubNew = onEvent('message:new', (data) => {
      if (convIdOf(data) !== convId) return;
      upsertStoreMessage(qc, convId, data as Message);
    });
    const unsubEdited = onEvent('message:edited', (data) => {
      if (convIdOf(data) !== convId) return;
      const m = data as Message;
      patchMessage(qc, m.id, () => mapChatMessageToStore(m));
    });
    const unsubDeleted = onEvent('message:deleted', (data) => {
      if (convIdOf(data) !== convId) return;
      const id = deletedIdOf(data);
      if (id) removeMessage(qc, id);
    });

    return () => {
      unsubNew();
      unsubEdited();
      unsubDeleted();
      s.off('connect', join);
      s.emit('conversation:leave', { conversationId: convId });
    };
  }, [qc, selfConvId]);
}
