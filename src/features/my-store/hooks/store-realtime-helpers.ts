import type { QueryClient } from '@tanstack/react-query';
import { peekOptimisticNonce, unregisterOptimisticNonce } from '@/features/chat';
import { myStoreKeys } from '@/services/keys';
import type { Message } from '@/features/chat/types';
import type { StoreMessage } from '@/features/my-store/types';
import { patchMessage, prependMessage, type MessagesCache } from './store-mutation-helpers';

/** Map 1 chat Message (payload WS) → StoreMessage của kho cá nhân. */
export function mapChatMessageToStore(m: Message): StoreMessage {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    type: m.type,
    plaintext: m.plaintext ?? null,
    metadata: m.metadata ?? null,
    isDeleted: m.isDeleted ?? false,
    createdAt: m.createdAt,
    updatedAt: m.editedAt ?? m.createdAt,
  };
}

function hasMessage(cache: MessagesCache | undefined, id: string): boolean {
  return cache?.pages.some((p) => p.items.some((x) => x.id === id)) ?? false;
}

/**
 * Chèn/thay tin realtime vào cache kho — dedup theo thứ tự: id đã có → nonce optimistic
 * (FIFO) → prepend mới. Tránh nhân đôi khi WS echo tin mình vừa gửi hoặc tin từ thiết bị khác.
 */
export function upsertStoreMessage(qc: QueryClient, selfConvId: string, m: Message): void {
  const mapped = mapChatMessageToStore(m);
  const cache = qc.getQueryData<MessagesCache>(myStoreKeys.messages());

  if (hasMessage(cache, mapped.id)) {
    patchMessage(qc, mapped.id, () => mapped);
    return;
  }

  const nonce = peekOptimisticNonce(selfConvId);
  if (nonce && hasMessage(cache, `temp-${nonce}`)) {
    patchMessage(qc, `temp-${nonce}`, () => mapped);
    unregisterOptimisticNonce(selfConvId, nonce);
    return;
  }

  prependMessage(qc, mapped);
}
