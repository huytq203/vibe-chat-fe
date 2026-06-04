# 04 — Messages

> Gửi tin (SERVER/E2E), lấy lịch sử, đánh dấu đọc, mention.

URL pattern: `/api/v1/conversations/{conversationId}/...`. Tất cả endpoint require JWT.

---

## Gửi tin nhắn — conversation SERVER

```http
POST /api/v1/conversations/{conversationId}/messages

{
  "plaintext": "Hey @huy chú ý nhé",            // bắt buộc khi type=TEXT; là caption optional khi gửi media
  "clientNonce": "uuid-FE-tự-sinh-cho-retry",   // optional, xem 10-idempotency.md
  "type": "TEXT",                                // optional, default TEXT
  "attachmentIds": ["media-uuid-READY"],         // optional — bắt buộc khi type là media; xem 14-media-upload.md
  "metadata": { "width": 1920 },                 // optional — metadata không nhạy cảm
  "replyToMessageId": "uuid-message-đang-reply", // optional
  "mentions": [                                  // optional — group tag
    { "userId": "uuid-keycloak-được-tag", "startOffset": 4, "length": 4 }
  ],
  "selfDestructTtl": 60                           // optional — tin tự huỷ sau N giây; xem 15-edit-recall-selfdestruct.md
}
```

- Chỉ dùng được nếu `conversation.encryptionType === "SERVER"` (gọi vào conv E2E → `400`).
- Server tự encrypt AES-256-GCM rồi lưu. Server tự gen `id` (UUID v4).
- `plaintext` tối đa 5000 ký tự.

### Quy tắc theo `type` (server validate ở biên)

| `type` | Yêu cầu | Lỗi nếu sai |
|---|---|---|
| `TEXT` (hoặc bỏ trống) | bắt buộc `plaintext` (không rỗng) | `400 MESSAGE_CONTENT_REQUIRED` |
| `IMAGE` / `VIDEO` / `AUDIO` / `FILE` | bắt buộc `attachmentIds` (≥1). `plaintext` là **caption optional** | `400 MESSAGE_ATTACHMENT_REQUIRED` |
| `STICKER` / `LOCATION` / `CONTACT` / `SYSTEM` / `CALL` | không ràng buộc 2 rule trên | — |

> ⚠️ Gửi `type: "IMAGE"` mà quên `attachmentIds` → `400 MESSAGE_ATTACHMENT_REQUIRED`. Nếu chỉ định gửi chữ, **đừng set `type`** (mặc định `TEXT`).
>
> - `attachmentIds` tối đa **10 file**/tin, mỗi id phải là media **đã `READY`** và **thuộc về chính người gửi** (xem [14-media-upload.md](./14-media-upload.md)). Sai/chưa upload xong → `400 MEDIA_NOT_FOUND`.

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

## Sửa / Gỡ tin & Tin tự huỷ

Edit (chỉ trong 5 phút), recall (gỡ với mọi người), và disappearing message (`selfDestructTtl`) tách riêng → **[15-edit-recall-selfdestruct.md](./15-edit-recall-selfdestruct.md)**.

Tóm tắt nhanh:
- `DELETE .../messages/{id}` — gỡ tin (người gửi, không giới hạn thời gian).
- `PATCH .../messages/{id}` (SERVER) / `PATCH .../secret-messages/{id}` (E2E) — sửa tin trong 5 phút.
- Thêm `selfDestructTtl` (giây) khi gửi → tin tự huỷ. FE tự ẩn theo `expireAt`.
- WS: `message:recall`, `message:edit`, `message:edit:secret`; nhận `message:deleted`, `message:edited`.

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
  plaintext: string | null;        // CÓ với SERVER. NULL với E2E, hoặc tin media KHÔNG có caption
  encrypted: {                     // CÓ với E2E, NULL với SERVER
    ciphertext: string;            // base64
    iv: string;                    // base64
    authTag: string;               // base64
    keyId: string;
    keyVersion: number;
  } | null;

  attachments: Attachment[];       // file đính kèm — [] nếu tin chỉ có text
  contentPreview: string | null;   // preview ngắn (≤150 char), NULL với E2E
  metadata: Record<string, unknown> | null;
  replyToMessageId: string | null;
  isEdited: boolean;
  editedAt: string | null;         // ISO — thời điểm sửa lần cuối; NULL nếu chưa sửa
  isDeleted: boolean;              // true = đã bị gỡ → render "Tin nhắn đã được thu hồi"
  deletedFor: 'NONE'|'SENDER'|'EVERYONE';
  expireAt: string | null;         // ISO — tin tự huỷ sẽ biến mất lúc này; NULL = tin thường
  isView: boolean;                 // true khi mọi member khác sender đã xem
  createdAt: string;               // ISO date
}

type Attachment = {
  mediaId: string;                 // UUID media — dùng để refresh URL khi hết hạn
  fileName: string;
  fileSize: number;                // byte
  mimeType: string;                // 'image/png', 'video/mp4'...
  width: number | null;            // px — ảnh/video
  height: number | null;           // px — ảnh/video
  duration: number | null;         // giây — video/audio
  downloadUrl: string | null;      // signed URL hiển thị/tải (CÓ HẠN). NULL nếu media đã xoá
};
```

> `downloadUrl` đã được server **ký sẵn và nhúng vào mỗi attachment** (cả tin realtime `message:new` lẫn `GET /messages`) — **mọi member** xem được ngay, không cần là chủ media.
> URL có **TTL** (hết hạn sau 1 khoảng) → khi ảnh cũ cuộn lại bị lỗi, refresh qua endpoint dưới.

---

## Gửi ảnh / video / file đính kèm

Tin nhắn `type: IMAGE | VIDEO | AUDIO | FILE` cần **upload media trước**, rồi tham chiếu qua **`attachmentIds`** (mảng UUID media đã `READY`). Toàn bộ flow upload (trực tiếp / presigned URL, category, giới hạn dung lượng, hiển thị) → **[14-media-upload.md](./14-media-upload.md)**.

```ts
const media = await uploadDirect(imageFile, 'ATTACHMENT'); // xem 14-media-upload.md → media.id (status READY)
await sendMessage(conversationId, {
  type: 'IMAGE',
  attachmentIds: [media.id],   // BẮT BUỘC với tin media — tối đa 10 id
  plaintext: 'caption',        // optional — bỏ trống nếu không có caption (đừng gửi '')
});
```

- Tin trả về có `attachments[]` (metadata + `mediaId` + `downloadUrl` ký sẵn). Tin không caption → `plaintext = null`.

### Refresh URL attachment (khi `downloadUrl` hết hạn)

```http
GET /api/v1/conversations/{conversationId}/attachments/{mediaId}/url
```

Response `200`:
```json
{
  "success": true,
  "data": {
    "mediaId": "8d2f...-uuid",
    "downloadUrl": "https://s3.../signed?...",
    "expiresIn": 900
  }
}
```

- Chỉ cần là **member của conversation** chứa tin có media đó (không cần là chủ media).
- Media không thuộc conversation này → `404 MEDIA_NOT_FOUND`.
- Chi tiết hiển thị / cache URL → [14-media-upload.md](./14-media-upload.md#hiển-thị-khi-nhận-tin).

---

**Liên quan:**
- 🖼️ Upload & gắn media → [14-media-upload.md](./14-media-upload.md)
- 🔁 Retry an toàn → [10-idempotency.md](./10-idempotency.md)
- 🔌 Gửi qua WebSocket → [08-websocket.md](./08-websocket.md#gửi-tin-nhắn)
- 🔐 E2E encrypt/decrypt → [09-encryption.md](./09-encryption.md)
- 🔔 Mention notification → [07-notifications.md](./07-notifications.md)
