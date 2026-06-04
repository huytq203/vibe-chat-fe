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
- `encryptionType`: `"SERVER"` (default, có preview/search) hoặc `"E2E"` (Secret Chat, FE encrypt — xem [09-encryption.md](./09-encryption.md)).
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
        "preview": "Hi nha",       // NULL nếu E2E
        "createdAt": "..."
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
```

### Quy tắc quyền

| Loại | Ai được xoá | Side-effect |
|---|---|---|
| `DIRECT` | Bất kỳ thành viên | Xoá đối xứng — cả 2 bên không còn thấy conversation |
| `GROUP` / `CHANNEL` | **Chỉ `ownerId`** | Tất cả member bị deactivate (`status='LEFT'`) |

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
| `CONVERSATION_ALREADY_DELETED` | 400 | Gọi 2 lần |

### Side-effect realtime

Server emit event `conversation:deleted` đến **mọi member** (cả vào room conv và user room). FE phải:
1. Đóng tab chat nếu đang mở conv đó.
2. Xoá conv khỏi sidebar.
3. Show toast "Cuộc trò chuyện đã bị xoá".

```ts
socket.on('conversation:deleted', ({ conversationId, deletedBy, deletedAt }) => {
  store.removeConversation(conversationId);
  if (currentOpenConvId === conversationId) {
    closeChat();
    showToast('Cuộc trò chuyện đã bị xoá');
  }
});
```

> 💡 Member trong GROUP muốn **rời nhóm** (không xoá cả nhóm) — endpoint `leave` chưa public ở v1, sẽ thêm sau. Tạm thời chỉ owner xoá toàn bộ.

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
| `encryptionType` | `'SERVER'\|'E2E'` | quyết định FE gửi tin thế nào — xem [09-encryption.md](./09-encryption.md) |
| `memberCount` | number | |
| `messageCount` | number | |
| `memberIds` | UUID[] | keycloakId thành viên ACTIVE |
| `members` | object[] (optional) | chi tiết — chỉ có ở endpoint detail |
| `lastMessage` | object\|null | embed message cuối — `preview` null nếu E2E |
| `lastMessageAt` | ISO date\|null | |
| `unreadCount` | number | unread của user hiện tại |
| `isPinned` | boolean | user hiện tại có ghim conversation lên đầu không |
| `createdAt` | ISO date | |

---

**Liên quan:**
- 📨 Gửi/nhận tin nhắn → [04-messages.md](./04-messages.md)
- 🔌 Realtime events → [08-websocket.md](./08-websocket.md)
- 🔐 SERVER vs E2E → [09-encryption.md](./09-encryption.md)
