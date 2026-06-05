# 09 — Mã hoá tin nhắn (SERVER mode)

> Tất cả conversation hiện tại dùng **SERVER encryption** (mặc định và duy nhất). BE tự encrypt AES-256-GCM — FE chỉ cần gửi plaintext qua HTTPS.

---

## Cách hoạt động

```
FE gửi plaintext → BE encrypt AES-256-GCM → lưu DB
BE decrypt → trả plaintext về FE khi list/get messages
```

FE **không cần** tự encrypt hay decrypt bất kỳ thứ gì. BE xử lý hoàn toàn.

---

## Gửi tin nhắn

Chỉ cần gửi `plaintext`:

```http
POST /api/v1/conversations/{convId}/messages
Authorization: Bearer <accessToken>

{
  "plaintext": "Xin chào!",
  "type": "TEXT"
}
```

Response luôn có `plaintext` (đã decrypt sẵn):

```json
{
  "success": true,
  "data": {
    "id": "...",
    "encryptionType": "SERVER",
    "plaintext": "Xin chào!",
    "contentPreview": "Xin chào!",
    ...
  }
}
```

---

## MessageResponseDto — field liên quan

| Field | Mô tả |
|---|---|
| `encryptionType` | Luôn là `"SERVER"` |
| `plaintext` | Nội dung tin đã decrypt. `null` nếu tin chỉ có media (không có text). |
| `contentPreview` | Preview ngắn ≤150 ký tự cho push notification. |

---

## Render tin nhắn

```ts
function getMessageText(message: MessageResponse): string {
  if (message.plaintext) return message.plaintext;
  if (message.attachments.length > 0) return '[File đính kèm]';
  return '[Tin nhắn]';
}
```

---

> 💡 **Không còn E2E (Secret Chat)**. Tính năng bảo mật conversation hiện tại là **Conversation Lock** (khoá bằng password, ẩn khỏi danh sách) — xem [18-conversation-lock.md](./18-conversation-lock.md).

---

**Liên quan:**
- 📨 Gửi/nhận tin → [04-messages.md](./04-messages.md)
- 🔒 Khoá conversation bằng password → [18-conversation-lock.md](./18-conversation-lock.md)
