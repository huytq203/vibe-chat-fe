# 03 — Conversations

> CRUD cuộc trò chuyện: tạo DIRECT 1-1, tạo GROUP, list, chi tiết, **xoá**.

URL prefix: `/api/v1/conversations`. Tất cả endpoint require JWT.

---

## Tạo chat 1-1 (DIRECT)

```http
POST /api/v1/conversations/direct
Authorization: Bearer ...
Content-Type: application/json

{
  "userId": "9d8b14cf-5392-452f-9ce3-557ded65d2d6",
  "encryptionType": "SERVER"   // optional, default "SERVER"
}
```

- `userId`: keycloakId của người kia.
- `encryptionType`: không cần truyền — luôn là `"SERVER"` (mặc định duy nhất).
- **Idempotent**: gọi lại với cùng `userId` → trả conversation cũ.

Response: `Conversation` object (xem mục [Conversation shape](#conversation-object--full-shape)).

## Tạo group

```http
POST /api/v1/conversations/group

{
  "name": "Team Vibe",
  "description": "Nhóm dev",     // optional
  "memberIds": [
    "9d8b14cf-5392-452f-9ce3-557ded65d2d6",
    "550e8400-e29b-41d4-a716-446655440000"
  ],
  "encryptionType": "SERVER"     // optional
}
```

- `memberIds`: **KHÔNG cần** truyền keycloakId của chính bạn (server tự thêm với role `OWNER`).
- Cần ≥ 1 member khác.

## Danh sách conversation của user

```http
GET /api/v1/conversations?page=1&limit=20
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "e7b5991b-1ddc-468e-952b-824024d700c6",
      "type": "DIRECT",
      "name": null,
      "ownerId": "...",
      "encryptionType": "SERVER",
      "memberCount": 2,
      "messageCount": 8,
      "memberIds": ["...", "..."],
      "lastMessage": {
        "id": "...",
        "senderId": "...",
        "type": "TEXT",
        "preview": "Hi nha",       // NULL nếu conversation bị lock, hoặc tin đã thu hồi
        "createdAt": "...",
        "expireAt": null            // ISO date nếu là tin tự huỷ, null nếu tin thường
      },
      "lastMessageAt": "2026-05-15T07:30:00Z",
      "unreadCount": 3,
      "isPinned": false,
      "createdAt": "..."
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

## Chi tiết 1 conversation

```http
GET /api/v1/conversations/{id}
```

`{id}` = UUID của conversation. Response giống item ở list nhưng có thêm `members[]` chi tiết:

```json
{
  "members": [
    {
      "userId": "...",
      "username": "huytq",
      "displayName": "Huy",
      "avatarUrl": null,
      "nickname": null,
      "role": "OWNER"
    }
  ]
}
```

> **`nickname`** = biệt danh đặt cho thành viên này **trong cuộc trò chuyện** (per-conversation,
> mọi thành viên đều thấy — giống Messenger). `null` nếu chưa đặt. Hiển thị tên gợi ý:
> `nickname ?? displayName`. Cách đặt: xem mục dưới.

## Đặt biệt danh (nickname) cho thành viên

> Đặt/đổi tên gọi cho **1 thành viên trong conversation này**. Là **per-conversation** và
> **mọi thành viên đều thấy** (không phải biệt danh riêng tư từng người). Dùng cho cả DIRECT
> (đặt cho người kia) lẫn GROUP.

```http
PUT /api/v1/conversations/{id}/members/{userId}/nickname
Authorization: Bearer ...
Content-Type: application/json

{ "nickname": "Sếp Tổng" }     // null hoặc "" để xoá biệt danh
```

- `{userId}` = Keycloak UUID của thành viên muốn đặt tên (có thể là chính mình).
- `nickname`: tối đa 100 ký tự (tự trim). Gửi `null`/rỗng → xoá, field về `null`.
- Người gọi và `{userId}` đều phải là thành viên **ACTIVE**.
- Bất kỳ thành viên ACTIVE nào cũng đặt được (Messenger-style).

Response `200`: `Conversation` object (chi tiết) với `members[].nickname` đã cập nhật.

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_NOT_FOUND` | 404 | UUID sai / đã xoá |
| `CONVERSATION_MEMBER_REQUIRED` | 403 | Bạn không phải thành viên |
| `CONVERSATION_TARGET_NOT_MEMBER` | 404 | `{userId}` không phải thành viên ACTIVE |
| `VALIDATION_ERROR` | 400 | `nickname` quá 100 ký tự |

> ⚠️ Thay đổi nickname **chưa** đẩy realtime qua WebSocket — các thành viên khác sẽ thấy tên mới
> ở lần fetch chi tiết/list kế tiếp.

## Ghim / bỏ ghim conversation

Ghim **riêng cho từng user** — conversation đã ghim luôn nằm **đầu** danh sách (mục [list](#danh-sách-conversation-của-user)).

```http
PATCH /api/v1/conversations/{id}/pin
Authorization: Bearer ...
Content-Type: application/json

{ "pinned": true }     // true = ghim, false = bỏ ghim
```

Response `200`: `Conversation` object với `isPinned` đã cập nhật.

- Idempotent: gọi `pinned: true` 2 lần vẫn OK.
- Bất kỳ thành viên ACTIVE nào cũng ghim được (kể cả DIRECT).

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_NOT_FOUND` | 404 | UUID sai / đã xoá |
| `CONVERSATION_MEMBER_REQUIRED` | 403 | Không phải thành viên |

> 📌 **Sắp xếp danh sách:** server trả về đã sort sẵn — **ghim trước** (`isPinned=true`), trong mỗi nhóm thì **mới nhất trước** (`lastMessageAt` giảm dần). FE chỉ cần render theo thứ tự nhận được, không cần tự sort lại.

## Xoá conversation

```http
DELETE /api/v1/conversations/{id}
Authorization: Bearer ...
Content-Type: application/json

{
  "scope": "BOTH"
}
```

`scope` là optional, mặc định `"ME"`.

### Tuỳ chọn scope

| `scope` | Áp dụng | Hành vi |
|---|---|---|
| `"ME"` *(default)* | DIRECT | Ẩn conversation chỉ với **bạn** — đối phương vẫn thấy bình thường |
| `"BOTH"` | DIRECT | Ẩn với **cả 2 phía** — đối phương nhận event real-time, conversation biến mất |
| *(ignored)* | GROUP / CHANNEL | `scope` không có tác dụng — xoá toàn cục, tất cả member bị deactivate |

> 💡 Hiện **UI thường** nên dùng `scope: "BOTH"` cho DIRECT để trải nghiệm đối xứng. Giữ `scope: "ME"` khi bạn muốn tính năng "xoá với tôi" (xoá lịch sử phía mình mà không ảnh hưởng đối phương).

### Quy tắc quyền

| Loại | Ai được xoá |
|---|---|
| `DIRECT` | Bất kỳ thành viên ACTIVE |
| `GROUP` / `CHANNEL` | **Chỉ `ownerId`** |

Response `200`:
```json
{ "success": true, "data": { "ok": true } }
```

### Lỗi

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_NOT_FOUND` | 404 | UUID sai hoặc đã xoá |
| `CONVERSATION_MEMBER_REQUIRED` | 403 | Không phải thành viên |
| `CONVERSATION_NOT_OWNER` | 403 | Group/Channel mà không phải owner |

### Side-effect realtime

**`scope="BOTH"` (DIRECT):** Event `conversation:deleted` gửi đến **cả 2 member**.

**`scope="ME"` (DIRECT):** Event chỉ gửi đến **người yêu cầu** — đối phương không nhận.

**GROUP/CHANNEL:** Event gửi đến **tất cả member**.

```ts
socket.on('conversation:deleted', ({ conversationId, deletedBy, deletedAt }) => {
  store.removeConversation(conversationId);
  if (currentOpenConvId === conversationId) {
    closeChat();
    showToast('Cuộc trò chuyện đã bị xoá');
  }
});
```

### Sample — hiện dialog cho user chọn scope

```ts
async function deleteDirectConversation(convId: string) {
  const choice = await showDialog({
    title: 'Xoá cuộc trò chuyện?',
    options: [
      { label: 'Xoá với tôi', value: 'ME', hint: 'Đối phương vẫn thấy' },
      { label: 'Xoá với cả hai', value: 'BOTH', hint: 'Cả hai bên xoá luôn' },
    ],
  });
  if (!choice) return;

  await api.delete(`/conversations/${convId}`, {
    body: JSON.stringify({ scope: choice }),
  });
  // Không cần xoá store tay — WS event sẽ đến (nếu scope=ME chỉ mình nhận)
}
```

> 💡 Member trong GROUP muốn **rời nhóm** (không xoá cả nhóm) — dùng endpoint `POST /conversations/:id/leave`.

> 👥 **Thêm thành viên / xin vào nhóm / duyệt yêu cầu** → xem [16-group-members.md](./16-group-members.md).

---

## Conversation object — full shape

| Field | Type | Mô tả |
|---|---|---|
| `id` | UUID | public ID, dùng cho URL/lookup |
| `type` | `'DIRECT'\|'GROUP'\|'CHANNEL'` | loại |
| `name` | `string\|null` | tên (null cho DIRECT) |
| `description` | `string\|null` | |
| `avatarUrl` | `string\|null` | |
| `ownerId` | UUID keycloakId | người tạo |
| `encryptionType` | `'SERVER'` | luôn là SERVER — BE tự mã hoá AES-256-GCM |
| `memberCount` | number | |
| `messageCount` | number | |
| `memberIds` | UUID[] | keycloakId thành viên ACTIVE |
| `members` | object[] (optional) | chi tiết — chỉ có ở endpoint detail |
| `lastMessage` | object\|null | embed message cuối — xem bảng bên dưới |
| `lastMessage.preview` | string\|null | null khi: conversation bị lock, tin đã thu hồi, hoặc tin tự huỷ |
| `lastMessage.expireAt` | ISO date\|null | null = tin thường; có giá trị = tin tự huỷ |
| `lastMessageAt` | ISO date\|null | |
| `unreadCount` | number | unread của user hiện tại |
| `isPinned` | boolean | user hiện tại có ghim conversation lên đầu không |
| `isLocked` | boolean | user hiện tại đã khoá conversation này bằng password chưa |
| `createdAt` | ISO date | |

### Khi nào `lastMessage` là `null`?

| Trường hợp | `lastMessage` | FE nên hiện gì |
|---|---|---|
| Conversation mới, chưa có tin | `null` | "Chưa có tin nhắn" |
| Tin cuối bị **thu hồi** | `null` | "Tin nhắn đã thu hồi" |
| Tin cuối là **tự huỷ** và đã hết TTL | `null` tạm thời → sau đó cập nhật về tin trước đó | "..." hoặc skeleton |
| Conversation bị **lock** (`isLocked: true`) | `null` | "🔒 Nhấn để mở" |

> ⚠️ **Eventual consistency cho tin tự huỷ**: Khi TTL hết, request đầu tiên trả `null`. Server tự động refresh về tin trước đó ngay sau đó — FE nhận WS event `conversation:encryption_changed` hoặc gọi lại GET detail để lấy giá trị đúng.

---

**Liên quan:**
- 📨 Gửi/nhận tin nhắn → [04-messages.md](./04-messages.md)
- 🔌 Realtime events → [08-websocket.md](./08-websocket.md)
- 🔐 Mã hoá SERVER → [09-encryption.md](./09-encryption.md)
- 🔒 Khoá conversation bằng password → [18-conversation-lock.md](./18-conversation-lock.md)
