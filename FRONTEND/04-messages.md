# 04 — Messages

> Gửi tin (SERVER/E2E), lấy lịch sử, đánh dấu đọc, mention.

URL pattern: `/api/v1/conversations/{conversationId}/...`. Tất cả endpoint require JWT.

---

## Gửi tin nhắn — conversation SERVER

```http
POST /api/v1/conversations/{conversationId}/messages

{
  "plaintext": "Hey @huy chú ý nhé",
  "clientNonce": "uuid-FE-tự-sinh-cho-retry",   // optional, xem 10-idempotency.md
  "type": "TEXT",                                // optional, default TEXT
  "metadata": { "width": 1920 },                 // optional
  "replyToMessageId": "uuid-message-đang-reply", // optional
  "mentions": [                                  // optional — group tag
    { "userId": "uuid-keycloak-được-tag", "startOffset": 4, "length": 4 }
  ]
}
```

- Chỉ dùng được nếu `conversation.encryptionType === "SERVER"` (gọi vào conv E2E → `400`).
- Server tự encrypt AES-256-GCM rồi lưu.
- Server tự gen `id` (UUID v4).
- `plaintext` tối đa 5000 ký tự.
- `mentions[]` (optional, ≤ 50 items): server **filter chỉ giữ user thực sự là member**, sau đó tạo notification riêng cho từng người được tag (push FCM **bất kể online**). User được tag sẽ nhận event `notification:new` qua WS + 1 push FCM nếu đã đăng ký token — xem [07-notifications.md](./07-notifications.md).

## Gửi tin nhắn — conversation E2E (Secret Chat)

```http
POST /api/v1/conversations/{conversationId}/secret-messages

{
  "encrypted": {
    "ciphertext": "<base64>",        // FE tự encrypt với AES-256-GCM
    "iv": "<base64 16 ký tự>",        // 12 byte IV
    "authTag": "<base64 24 ký tự>",   // 16 byte authTag
    "keyId": "client-managed-key-id",
    "keyVersion": 1
  },
  "clientNonce": "...",                // optional
  "type": "TEXT",
  "mentions": [                        // optional — phần này KHÔNG được encrypt
    { "userId": "uuid-keycloak", "startOffset": 0, "length": 4 }
  ]
}
```

> ⚠️ Trong E2E, `mentions` là metadata công khai (server cần để route notification). Đừng đặt thông tin nhạy cảm trong `userId/offset/length`.

- FE **chịu trách nhiệm encrypt** trước khi gửi. Server pass-through.
- Cách FE manage key — xem [09-encryption.md](./09-encryption.md).

## Mention `@user` — workflow đầy đủ

```ts
// 1. Khi user gõ '@', show suggest list từ member của conv
const members = conv.members;   // có từ GET /conversations/{id}

// 2. User chọn @huy → FE chèn text + track offset
const text = 'Hey @huy chú ý nhé';
const mentions = [
  { userId: 'uuid-của-huy', startOffset: 4, length: 4 },   // '@huy' bắt đầu ở vị trí 4
];

// 3. Gửi như bình thường
await fetch(`/api/v1/conversations/${conv.id}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ plaintext: text, mentions }),
});

// 4. Render khi nhận: parse mentions[] và highlight + click → mở profile
function renderText(msg: MessageResponse) {
  if (!msg.plaintext || !msg.mentions?.length) return msg.plaintext;
  // ... insert <span class="mention" data-user-id={...}> tại các offset
}
```

> Server filter mention không thuộc conv → kết quả trả về có thể có mentions ngắn hơn input. FE không cần lo edge case này.

## Lấy lịch sử tin nhắn

```http
GET /api/v1/conversations/{conversationId}/messages?limit=20&before=2026-05-15T10:00:00Z
```

- Sort theo `createdAt` desc (mới nhất trước).
- Cursor pagination qua `before` (ISO date) — lấy tin có `createdAt < before`.
- `limit` mặc định 20, tối đa 100.
- Response trả về cả SERVER và E2E messages — phân biệt qua `encryptionType` field.

Response:
```json
{
  "success": true,
  "data": [ { ... message }, ... ],
  "meta": {
    "limit": 20,
    "nextCursor": "2026-05-15T09:55:00Z"   // dùng làm `before` cho lần fetch tiếp
  }
}
```

`nextCursor` = `null` → đã hết tin.

## Đánh dấu đã đọc

```http
POST /api/v1/conversations/{conversationId}/messages/{messageId}/read
```

Response: `204 No Content`.

Sau khi gọi → `conversation.unreadCount` của user reset về 0, server broadcast event `message:read` tới các socket khác.

> Hoặc dùng WS event `message:read` — kết quả tương đương. Xem [08-websocket.md](./08-websocket.md#read-receipt).

---

## Message object — full shape

```ts
{
  id: string;                  // UUID public của message
  conversationId: string;      // UUID của conversation
  senderId: string;            // keycloakId người gửi
  type: 'TEXT'|'IMAGE'|'VIDEO'|'AUDIO'|'FILE'|'STICKER'|'LOCATION'|'CONTACT'|'SYSTEM'|'CALL';

  encryptionType: 'SERVER'|'E2E';  // copy từ conv — discriminator

  // 1 trong 2 field dưới có giá trị:
  plaintext: string | null;        // CÓ với SERVER, NULL với E2E
  encrypted: {                     // CÓ với E2E, NULL với SERVER
    ciphertext: string;            // base64
    iv: string;                    // base64
    authTag: string;               // base64
    keyId: string;
    keyVersion: number;
  } | null;

  contentPreview: string | null;   // preview ngắn (≤150 char), NULL với E2E
  metadata: Record<string, unknown> | null;
  replyToMessageId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  isView: boolean;                 // true khi mọi member khác sender đã xem
  createdAt: string;               // ISO date
}
```

---

**Liên quan:**
- 🔁 Retry an toàn → [10-idempotency.md](./10-idempotency.md)
- 🔌 Gửi qua WebSocket → [08-websocket.md](./08-websocket.md#gửi-tin-nhắn)
- 🔐 E2E encrypt/decrypt → [09-encryption.md](./09-encryption.md)
- 🔔 Mention notification → [07-notifications.md](./07-notifications.md)
