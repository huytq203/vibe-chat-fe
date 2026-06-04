# 15 — Sửa / Gỡ tin & Tin tự huỷ

> Chỉnh sửa tin (edit), gỡ tin (recall/thu hồi), và tin nhắn tự huỷ (disappearing message).

URL pattern: `/api/v1/conversations/{conversationId}/...`. Tất cả require JWT.
Mọi thao tác đều có **bản WS tương đương** (xem cuối file) — kết quả giống hệt REST.

---

## 1. Gỡ tin nhắn (thu hồi với mọi người)

```http
DELETE /api/v1/conversations/{conversationId}/messages/{messageId}
```

- **Chỉ người gửi** mới gỡ được (tin của người khác → `403 MESSAGE_NOT_OWNED`).
- **KHÔNG giới hạn thời gian** — gỡ được tin cũ bất kỳ.
- Áp dụng cho **cả SERVER lẫn E2E**, mọi `type` (text/media/sticker…).
- Server xoá luôn nội dung nhạy cảm: `content`, `contentPreview`, `attachments`, `mentions` → sau khi gỡ không lấy lại được.
- **Idempotent**: gỡ lại tin đã gỡ → trả về `200` với trạng thái đã gỡ (không lỗi).

Response `200` — trả lại message ở trạng thái đã gỡ:
```json
{
  "success": true,
  "data": {
    "id": "msg-uuid",
    "isDeleted": true,
    "deletedFor": "EVERYONE",
    "plaintext": null,
    "encrypted": null,
    "attachments": []
    // ... các field khác của Message object
  }
}
```

> **Hiển thị**: khi `isDeleted === true`, render placeholder thay nội dung — vd _"Tin nhắn đã được thu hồi"_. Đừng cố decrypt (`plaintext`/`encrypted` đã là `null`).

> **`GET /messages`** không trả tin đã gỡ nữa — nên placeholder chỉ cần hiện cho phiên hiện tại (tin đang nằm trong UI). Reload lịch sử → tin biến mất hẳn.

---

## 2. Sửa tin nhắn (chỉ trong 5 phút)

Cửa sổ sửa = **5 phút kể từ `createdAt`**. Quá hạn → `422 MESSAGE_EDIT_WINDOW_EXPIRED`.
Chỉ người gửi. Tin đã gỡ không sửa được (`409 MESSAGE_ALREADY_DELETED`).

### SERVER conv — gửi plaintext mới (BE re-encrypt)

```http
PATCH /api/v1/conversations/{conversationId}/messages/{messageId}

{ "plaintext": "nội dung đã sửa" }
```

### E2E conv — gửi ciphertext mới (client tự encrypt)

```http
PATCH /api/v1/conversations/{conversationId}/secret-messages/{messageId}

{
  "encrypted": {
    "ciphertext": "<base64>",
    "iv": "<base64 16 ký tự>",
    "authTag": "<base64 24 ký tự>",
    "keyId": "client-managed-key-id",
    "keyVersion": 1
  }
}
```

> ⚠️ Gọi nhầm endpoint với loại conv → `400 VALIDATION_ERROR`. SERVER dùng `/messages/:id`, E2E dùng `/secret-messages/:id`.

Response `200` — message đã cập nhật, có `isEdited: true` + `editedAt`:
```json
{
  "success": true,
  "data": { "id": "msg-uuid", "isEdited": true, "editedAt": "2026-06-02T10:05:00.000Z", "plaintext": "nội dung đã sửa" }
}
```

### UX gợi ý

```ts
const EDIT_WINDOW_MS = 5 * 60 * 1000;

function canEdit(msg: MessageResponse, myUserId: string): boolean {
  return (
    msg.senderId === myUserId &&
    !msg.isDeleted &&
    Date.now() - new Date(msg.createdAt).getTime() < EDIT_WINDOW_MS
  );
}
```

- Chỉ hiện nút "Sửa" khi `canEdit()` đúng → giảm số lần ăn lỗi `422`.
- Tin đã sửa: hiện nhãn _"(đã chỉnh sửa)"_ khi `isEdited === true`.
- Vẫn nên bắt lỗi `422`/`409` (đồng hồ FE/BE lệch hoặc race) → toast + revert nội dung về bản cũ.

---

## 3. Tin nhắn tự huỷ (disappearing message)

Thêm field `selfDestructTtl` (số **giây**) khi gửi tin — tin sẽ tự biến mất sau khoảng đó **kể từ lúc gửi**.

```http
POST /api/v1/conversations/{conversationId}/messages

{
  "plaintext": "Tin này tự huỷ sau 1 phút",
  "selfDestructTtl": 60
}
```

- Dùng được cho cả `POST /messages` (SERVER) lẫn `POST /secret-messages` (E2E).
- Khoảng hợp lệ: **5 giây → 30 ngày** (`2592000`). Ngoài khoảng → `400 VALIDATION_ERROR`.
- Bỏ trống = tin thường (không tự huỷ).

Message trả về có thêm `expireAt` (ISO, thời điểm tin biến mất):
```json
{ "id": "msg-uuid", "expireAt": "2026-06-02T10:06:00.000Z" }
```

### FE phải tự ẩn tin khi tới hạn

Server dùng cơ chế xoá nền (TTL) có thể **trễ tới ~60s**, nên **đừng chờ server** — ẩn ngay theo `expireAt`:

```ts
function scheduleSelfDestruct(msg: MessageResponse, onExpire: (id: string) => void) {
  if (!msg.expireAt) return;
  const ms = new Date(msg.expireAt).getTime() - Date.now();
  if (ms <= 0) return onExpire(msg.id);              // đã quá hạn → ẩn luôn
  const t = setTimeout(() => onExpire(msg.id), ms);
  return () => clearTimeout(t);                       // nhớ clear khi unmount
}
```

- `GET /messages` đã **lọc sẵn** tin quá hạn → reload lịch sử sẽ không thấy lại.
- Gợi ý UX: hiện đồng hồ đếm ngược / icon hẹn giờ dựa trên `expireAt`.

> Lưu ý: đây là tính năng **tiện ích, không phải bảo mật tuyệt đối**. Người nhận vẫn có thể chụp màn hình / đọc trước khi hết hạn. Với yêu cầu riêng tư cao, kết hợp conversation E2E.

---

## 4. Bản WebSocket (tương đương REST)

Có thể thao tác qua socket thay vì REST — body giống hệt, thêm `conversationId` + `messageId`.

```ts
// Gỡ tin
const ack = await socket.emitWithAck('message:recall', { conversationId, messageId });
// Sửa tin SERVER
await socket.emitWithAck('message:edit', { conversationId, messageId, plaintext: 'mới' });
// Sửa tin E2E
await socket.emitWithAck('message:edit:secret', { conversationId, messageId, encrypted: {...} });
// ack: { ok: true, messageId } | { ok: false, code, error, message }
```

Tin tự huỷ: thêm `selfDestructTtl` vào `message:send` / `message:send:secret` như REST.

### Lắng nghe event realtime (mọi client trong conv đều nhận)

```ts
// Tin bị gỡ — thay nội dung bằng placeholder
socket.on('message:deleted', ({ conversationId, messageId, deletedBy, deletedAt }) => {
  store.markDeleted(messageId);   // render "Tin nhắn đã được thu hồi"
});

// Tin được sửa — cập nhật nội dung tại chỗ (payload là Message object đầy đủ, đã decrypt với SERVER)
socket.on('message:edited', (message /* MessageResponse */) => {
  store.upsertMessage(message);   // hiện nhãn "(đã chỉnh sửa)"
});
```

> Cả 2 event được emit vào **conversation room** lẫn **user room** từng member → client cập nhật được cả khi đang mở chat lẫn chỉ xem sidebar.

---

## Tóm tắt lỗi hay gặp

| Code | HTTP | Khi nào |
|---|---|---|
| `MESSAGE_NOT_OWNED` | 403 | Gỡ/sửa tin không phải của mình |
| `MESSAGE_EDIT_WINDOW_EXPIRED` | 422 | Sửa tin quá 5 phút |
| `MESSAGE_ALREADY_DELETED` | 409 | Sửa tin đã bị gỡ |
| `VALIDATION_ERROR` | 400 | Sai endpoint SERVER/E2E, hoặc `selfDestructTtl` ngoài khoảng 5–2592000 |

---

**Liên quan:**
- 📨 Gửi/nhận tin & Message shape → [04-messages.md](./04-messages.md)
- 🔌 WS event tổng hợp → [08-websocket.md](./08-websocket.md)
- 🔐 E2E encrypt cho edit → [09-encryption.md](./09-encryption.md)
- 🧯 Bảng mã lỗi → [12-error-codes.md](./12-error-codes.md)
