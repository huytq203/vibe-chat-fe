# 10 — Idempotency với `clientNonce`

> Retry tin nhắn khi mạng chập chờn mà không tạo duplicate.

---

## Vấn đề

Khi mạng chập chờn, FE có thể không biết tin đã gửi thành công chưa và retry → server tạo trùng.

## Giải pháp

FE sinh `clientNonce` (UUID hoặc bất kỳ chuỗi unique ≤ 100 char) **1 lần** cho mỗi tin nhắn logic, **giữ nguyên** qua các lần retry.

```ts
async function sendMessage(text: string, conversationId: string) {
  const nonce = crypto.randomUUID();    // ← sinh 1 lần, lưu queue local

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plaintext: text,
          clientNonce: nonce,        // SAME nonce mỗi lần retry
        }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw new Error('Send failed after retries');
}
```

Server thấy `(senderId, clientNonce)` đã tồn tại → trả lại message cũ thay vì tạo mới.

---

## Quy tắc

- ✅ Mỗi tin nhắn **logic** sinh **1 nonce**. Tin tiếp theo phải nonce khác.
- ✅ Retry → **giữ nguyên** nonce cũ.
- ✅ Áp dụng cho cả REST (`POST /messages`, `POST /secret-messages`) lẫn WS (`message:send`, `message:send:secret`).
- ❌ Đừng gen nonce mới mỗi lần retry — sẽ tạo duplicate.
- ❌ Nonce không bắt buộc nhưng **rất nên có** cho mọi POST message ở client production.

## Tích hợp với offline queue

Khi user gửi tin offline → save vào queue local kèm nonce → flush khi reconnect:

```ts
interface QueuedMessage {
  nonce: string;
  conversationId: string;
  plaintext: string;
  createdAt: number;
}

const queue: QueuedMessage[] = loadQueueFromIndexedDB();

async function flushQueue() {
  for (const item of queue) {
    try {
      await fetch(`/api/v1/conversations/${item.conversationId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaintext: item.plaintext, clientNonce: item.nonce }),
      });
      removeFromQueue(item.nonce);
    } catch {
      // tiếp tục thử lần sau
      break;
    }
  }
}

window.addEventListener('online', flushQueue);
```

Server tự dedupe nếu có item đã từng gửi nửa chừng thành công ở lần trước.

---

**Liên quan:**
- 📨 Endpoint gửi message → [04-messages.md](./04-messages.md)
- 📖 Pattern Optimistic UI → [13-cookbook.md](./13-cookbook.md#optimistic-ui)
