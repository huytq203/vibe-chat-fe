# 29 — Ghim tin nhắn (Pinned messages)

> Ghim tin nhắn quan trọng lên đầu cuộc trò chuyện. Áp dụng cho **cả 1-1 lẫn nhóm**, **tối đa 5 tin** mỗi conversation.
> Prefix REST `/api/v1/conversations/{conversationId}`. Mọi endpoint cần `Authorization: Bearer` và bạn phải là thành viên.

---

## Quyền ghim

| Loại | Ai được ghim/bỏ ghim |
|---|---|
| **DIRECT (1-1)** | Cả hai phía — luôn cho phép |
| **GROUP** | Theo `settings.whoCanPin` ([28](./28-group-settings.md)): `ADMIN` = OWNER/ADMIN/MODERATOR, `ALL` = mọi thành viên |

Thiếu quyền → `403 CONVERSATION_PIN_RESTRICTED`.

---

## 1. Ghim 1 tin

```http
POST /api/v1/conversations/{conversationId}/messages/{messageId}/pin
Authorization: Bearer ...
```

Response `200`: **Message object** (đã giải mã, shape giống [04-messages.md](./04-messages.md)).

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_PIN_RESTRICTED` | 403 | Nhóm `whoCanPin=ADMIN` mà bạn là MEMBER |
| `MESSAGE_NOT_FOUND` | 404 | messageId sai / không thuộc conversation |
| `MESSAGE_ALREADY_DELETED` | 409 | Tin đã bị gỡ — không ghim được |
| `MESSAGE_ALREADY_PINNED` | 409 | Tin đã được ghim rồi |
| `PIN_LIMIT_REACHED` | 400 | Đã đủ 5 tin ghim — bỏ bớt rồi ghim lại |

---

## 2. Bỏ ghim 1 tin

```http
DELETE /api/v1/conversations/{conversationId}/messages/{messageId}/pin
Authorization: Bearer ...
```

Response `200`: `{ "success": true, "data": { "ok": true } }`.

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_PIN_RESTRICTED` | 403 | Không có quyền bỏ ghim |
| `MESSAGE_NOT_PINNED` | 404 | Tin này chưa được ghim |

> Khi 1 tin bị **thu hồi** ([15](./15-edit-recall-selfdestruct.md)) thì tự động bị gỡ khỏi danh sách ghim.

---

## 3. Danh sách tin đang ghim

```http
GET /api/v1/conversations/{conversationId}/pinned-messages
Authorization: Bearer ...
```

Response `200`: mảng **Message object** (đã giải mã, **mới ghim đứng đầu**, tối đa 5).

```jsonc
{
  "success": true,
  "data": [
    { "id": "…", "senderId": "…", "type": "TEXT", "plaintext": "Quy định nhóm…", "createdAt": "…", "...": "" }
  ]
}
```

- Tin đã bị xoá cứng (tự huỷ TTL) tự động bị loại khỏi kết quả.
- `Conversation.pinnedCount` (trong [03](./03-conversations.md)) cho biết số tin đang ghim mà không cần gọi endpoint này.

---

## Realtime

| Event | Gửi cho | Payload | FE làm gì |
|---|---|---|---|
| `conversation:pin_updated` | Member đang mở conversation | `{ conversationId, action, messageId, by, at }` | `action`=`PINNED`/`UNPINNED` → refetch `pinned-messages` (hoặc cập nhật tại chỗ) |

```ts
socket.on('conversation:pin_updated', ({ conversationId }) => {
  store.refetchPinnedMessages(conversationId);
});
```

---

**Liên quan:**
- 💬 Message object → [04-messages.md](./04-messages.md)
- ⚙️ Quyền `whoCanPin` → [28-group-settings.md](./28-group-settings.md)
- ⚠️ Mã lỗi → [12-error-codes.md](./12-error-codes.md)
