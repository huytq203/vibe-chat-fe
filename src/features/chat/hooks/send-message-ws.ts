import { apiAuth } from '@/lib/api/client';
import { getSocket } from '@/lib/ws/socket';
import type { SendMessageInput } from '@/features/chat/types';

type SendAck = { ok: true; messageId: string } | { ok: false; error?: string };

const WS_SEND_TIMEOUT_MS = 10_000;
const sendQueues = new Map<string, Promise<unknown>>();

async function emitSend(input: SendMessageInput, clientNonce: string): Promise<string> {
  const socket = getSocket(apiAuth.getToken());
  if (!socket || !socket.connected) {
    throw new Error('Không có kết nối realtime');
  }

  const ack = (await socket
    .timeout(WS_SEND_TIMEOUT_MS)
    .emitWithAck('message:send', {
      conversationId: input.conversationId,
      // Content plaintext. Caption rỗng → BỎ field (đừng gửi '') theo 04-messages.md.
      plaintext: input.plaintext ? input.plaintext : undefined,
      clientNonce,
      type: input.type ?? 'TEXT',
      // Bắt buộc với tin media; bỏ khi không có.
      attachmentIds: input.attachmentIds?.length ? input.attachmentIds : undefined,
      replyToMessageId: input.replyToMessageId,
      // Tag @user (group) — bỏ khi rỗng. Xem 04-messages.md.
      mentions: input.mentions?.length ? input.mentions : undefined,
      metadata: input.metadata,
      // Tin tự huỷ — giống REST. Bỏ field nếu không set (xem doc 15).
      selfDestructTtl: input.selfDestructTtl,
    })) as SendAck;
  if (!ack || ack.ok !== true) {
    throw new Error((ack as { error?: string })?.error ?? 'Gửi thất bại');
  }
  return ack.messageId;
}

export function sendMessageWs(input: SendMessageInput, clientNonce: string): Promise<string> {
  const convId = input.conversationId;
  const prev = sendQueues.get(convId) ?? Promise.resolve();
  // Mỗi tin chờ tin trước resolve (kể cả khi prev reject — dùng .catch để không
  // làm chain chết). UI optimistic vẫn hiện ngay, chỉ network bị queue.
  const next = prev
    .catch(() => undefined)
    .then(() => emitSend(input, clientNonce));
  sendQueues.set(convId, next);
  // Cleanup map entry khi queue rỗng để không giữ ref vĩnh viễn.
  // .catch(noop) ở nhánh cleanup để rejection của `next` không thành
  // unhandledRejection (nhánh chính `return next` mới là nơi mutation xử lý lỗi).
  next
    .finally(() => {
      if (sendQueues.get(convId) === next) sendQueues.delete(convId);
    })
    .catch(() => undefined);
  return next;
}
