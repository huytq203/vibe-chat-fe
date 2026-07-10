// Registry nonce theo FIFO per conversation — dùng để useChatRealtime dedup khi
// server không echo clientNonce trong metadata của WS broadcast.
const pendingNonces = new Map<string, string[]>();

export function registerOptimisticNonce(convId: string, nonce: string) {
  const list = pendingNonces.get(convId) ?? [];
  pendingNonces.set(convId, [...list, nonce]);
}

export function unregisterOptimisticNonce(convId: string, nonce: string) {
  const list = pendingNonces.get(convId) ?? [];
  const next = list.filter((n) => n !== nonce);
  if (next.length === 0) pendingNonces.delete(convId);
  else pendingNonces.set(convId, next);
}

// Trả về nonce FIFO đầu tiên của conv (không xóa) — dùng bởi upsertMessage để
// match WS echo với đúng tin optimistic khi incomingNonce=null.
export function peekOptimisticNonce(convId: string): string | null {
  return pendingNonces.get(convId)?.[0] ?? null;
}
