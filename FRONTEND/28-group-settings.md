# 28 — Cài đặt nhóm: đổi tên, quyền hạn, chặn thành viên

> Đổi **tên/mô tả/công khai** nhóm, cấu hình **quyền hạn** (join link, phê duyệt, quyền chat/ghim/sửa tên, đánh dấu trưởng nhóm), và **chặn (ban)** thành viên.
> Prefix REST `/api/v1/conversations`. Mọi endpoint cần `Authorization: Bearer`.
> Chỉ áp dụng cho `type` = `GROUP` / `CHANNEL` (gọi trên DIRECT → `400 CONVERSATION_NOT_GROUP`).

---

## Khái niệm: `settings` của nhóm

Mỗi nhóm có object `settings` trả kèm trong [Conversation object](./03-conversations.md). Giá trị `ADMIN` = OWNER/ADMIN/MODERATOR; `ALL` = mọi thành viên ACTIVE.

| Field | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `joinByLink` | bool | `true` | Cho phép vào nhóm qua **link/QR chia sẻ** ([25](./25-share-links.md)). `false` → dùng link sẽ bị `CONVERSATION_JOIN_LINK_DISABLED`. |
| `joinApproval` | bool | `false` | Vào qua link/QR **phải được phê duyệt** → tạo join-request thay vì vào thẳng. |
| `whoCanEditInfo` | `ADMIN`\|`ALL` | `ADMIN` | Ai được sửa **tên/mô tả** nhóm. |
| `whoCanSend` | `ADMIN`\|`ALL` | `ALL` | **Quyền chat** — ai được gửi tin nhắn. `ADMIN` = "khoá nhóm", chỉ quản trị viên gửi được. |
| `whoCanPin` | `ADMIN`\|`ALL` | `ADMIN` | Ai được **ghim/bỏ ghim** tin ([29](./29-pinned-messages.md)). |
| `markLeaderMessages` | bool | `true` | Bật **đánh dấu (badge) tin của trưởng/phó nhóm** trên UI (xem [§ Đánh dấu trưởng nhóm](#đánh-dấu-tin-của-trưởngphó-nhóm)). |

Conversation object giờ có thêm:
```jsonc
{
  "id": "…uuid",
  "type": "GROUP",
  "name": "Nhóm Dev",
  "isPublic": false,
  "settings": {
    "joinByLink": true,
    "joinApproval": false,
    "whoCanEditInfo": "ADMIN",
    "whoCanSend": "ALL",
    "whoCanPin": "ADMIN",
    "markLeaderMessages": true
  },
  "pinnedCount": 2,
  "...": "các field cũ giữ nguyên"
}
```

---

## 1. Đổi tên / mô tả / avatar / công khai nhóm

```http
PATCH /api/v1/conversations/{id}
Authorization: Bearer ...
Content-Type: application/json

{
  "name": "Nhóm Kỹ thuật",        // optional, 1–150 ký tự
  "description": "Phòng dev",      // optional, ≤500; gửi null để xoá
  "avatarMediaId": "…uuid",        // optional; mediaId ảnh đã upload, gửi null để gỡ
  "isPublic": true                 // optional
}
```

- Tất cả field optional — chỉ field gửi lên mới đổi.
- **Quyền**: `name`/`description`/`avatarMediaId` theo `settings.whoCanEditInfo`. `isPublic` **luôn** chỉ OWNER/ADMIN/MODERATOR đổi được.
- **Avatar**: upload ảnh trước qua [14-media-upload.md](./14-media-upload.md) lấy `mediaId`, rồi gửi `avatarMediaId`. BE validate media thuộc bạn + đã READY, ký URL và trả về trong `avatarUrl` của Conversation object (URL ký lại mỗi lần đọc chi tiết). Gửi `avatarMediaId: null` để gỡ avatar.

Response `200`: **Conversation object đầy đủ** (đã cập nhật).

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_NOT_FOUND` | 404 | UUID sai / đã xoá |
| `CONVERSATION_NOT_GROUP` | 400 | Là DIRECT |
| `CONVERSATION_MEMBER_REQUIRED` | 403 | Không phải thành viên |
| `CONVERSATION_EDIT_INFO_RESTRICTED` | 403 | `whoCanEditInfo=ADMIN` mà bạn chỉ là MEMBER (name/description/avatar) |
| `CONVERSATION_INSUFFICIENT_ROLE` | 403 | MEMBER cố đổi `isPublic` |
| `MEDIA_NOT_FOUND` / `MEDIA_NOT_OWNED` / `MEDIA_NOT_UPLOADED` | 404/403/400 | `avatarMediaId` không thuộc bạn / chưa upload xong |
| `VALIDATION_ERROR` | 400 | Sai format field |

---

## 2. Cập nhật quyền hạn nhóm

```http
PATCH /api/v1/conversations/{id}/settings
Authorization: Bearer ...
Content-Type: application/json

{
  "joinByLink": true,
  "joinApproval": true,
  "whoCanEditInfo": "ALL",
  "whoCanSend": "ADMIN",
  "whoCanPin": "ALL",
  "markLeaderMessages": false
}
```

- Tất cả field optional. **Chỉ OWNER/ADMIN/MODERATOR**.
- Response `200`: Conversation object đầy đủ.

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_INSUFFICIENT_ROLE` | 403 | Bạn chỉ là MEMBER |
| `CONVERSATION_NOT_GROUP` | 400 | Là DIRECT |
| `VALIDATION_ERROR` | 400 | scope không phải `ADMIN`/`ALL` |

> Sau khi đổi info/settings, BE phát WS `conversation:updated` (xem [§ Realtime](#realtime)).

---

## 3. Quyền chat (`whoCanSend`)

Khi `whoCanSend = "ADMIN"`, MEMBER gọi gửi tin ([04-messages.md](./04-messages.md)) sẽ bị:

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_SEND_RESTRICTED` | 403 | MEMBER gửi tin trong nhóm `whoCanSend=ADMIN` |

FE nên **ẩn ô nhập / hiện banner "Chỉ quản trị viên được nhắn"** dựa vào `settings.whoCanSend` + vai trò của mình (lấy từ `members[].role`). DIRECT 1-1 luôn cho phép gửi.

---

## 4. Chặn (ban) / bỏ chặn thành viên

> "Tìm user trong nhóm để chặn": FE lọc trong `members[]` (đã có ở Conversation detail) rồi gọi ban theo `userId`.

### 4a. Chặn

```http
POST /api/v1/conversations/{id}/members/{userId}/ban
Authorization: Bearer ...
```

- Chỉ OWNER/ADMIN/MODERATOR, **chỉ chặn được người vai trò thấp hơn mình**. Không chặn OWNER, không tự chặn.
- Người bị chặn có `status = BANNED`: **không thể được add lại / không vào lại được qua link/join-request** cho tới khi bỏ chặn.

Response `200`: `{ "success": true, "data": { "ok": true } }`.

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_INSUFFICIENT_ROLE` | 403 | Chặn người ngang/cao hơn vai trò |
| `CONVERSATION_CANNOT_REMOVE_SELF` | 400 | Tự chặn mình |
| `CONVERSATION_CANNOT_REMOVE_OWNER` | 403 | Chặn chủ nhóm |
| `CONVERSATION_TARGET_NOT_MEMBER` | 404 | userId không phải thành viên ACTIVE |
| `CONVERSATION_MEMBER_ALREADY_BANNED` | 409 | Đã bị chặn từ trước |

### 4b. Bỏ chặn

```http
DELETE /api/v1/conversations/{id}/members/{userId}/ban
Authorization: Bearer ...
```

Response `200`: `{ "ok": true }`. Sau khi bỏ chặn user có thể được add / join lại.

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_NOT_BANNED` | 404 | User này chưa bị chặn |
| `CONVERSATION_INSUFFICIENT_ROLE` | 403 | Bạn không phải quản trị viên |

> Ban phát WS `conversation:member_removed` với `reason: "KICKED"` (giống kick — xem [16-group-members.md](./16-group-members.md#realtime-websocket)). FE xử lý y như kick.

---

## 5. Phê duyệt vào nhóm qua link (`joinApproval`)

Khi `joinApproval = true`, **dùng link/QR ([25](./25-share-links.md)) sẽ KHÔNG vào thẳng** mà tạo join-request chờ duyệt. Endpoint `POST /share-links/{code}/use` trả:

```jsonc
{
  "type": "GROUP",
  "group": { "conversationId": "…uuid", "joined": false, "pending": true }
}
```

- `pending: true` → FE hiện "Đã gửi yêu cầu vào nhóm, chờ duyệt".
- Quản trị viên duyệt/từ chối qua flow join-request có sẵn ([16-group-members.md §3–5](./16-group-members.md)).
- `joinByLink = false` → `POST /use` trả `403 CONVERSATION_JOIN_LINK_DISABLED`.

---

## Đánh dấu tin của trưởng/phó nhóm

`settings.markLeaderMessages` chỉ là **cờ hiển thị** — BE không thêm field vào từng message. FE tự render badge:

```ts
// role lấy từ Conversation.members[] theo senderId của tin
const sender = members.find((m) => m.userId === message.senderId);
const showBadge =
  conversation.settings.markLeaderMessages &&
  ['OWNER', 'ADMIN', 'MODERATOR'].includes(sender?.role ?? 'MEMBER');
// OWNER → "Trưởng nhóm", ADMIN/MODERATOR → "Phó nhóm"
```

---

## Realtime

| Event | Gửi cho | Payload | FE làm gì |
|---|---|---|---|
| `conversation:updated` | Member trong nhóm | `{ conversationId, updatedBy, at }` | Refetch `GET /conversations/{id}` để lấy name/settings mới |
| `conversation:member_removed` | Như [16](./16-group-members.md) | `{ …, reason: "KICKED" }` | Ban dùng chung event với kick |

```ts
socket.on('conversation:updated', ({ conversationId }) => {
  store.refetchConversation(conversationId); // tên/settings/isPublic có thể đã đổi
});
```

---

**Liên quan:**
- 💬 Conversation object đầy đủ → [03-conversations.md](./03-conversations.md)
- 👥 Thêm/kick thành viên, join-request → [16-group-members.md](./16-group-members.md)
- 📌 Ghim tin nhắn → [29-pinned-messages.md](./29-pinned-messages.md)
- 🔗 Link & QR vào nhóm → [25-share-links.md](./25-share-links.md)
- ⚠️ Mã lỗi → [12-error-codes.md](./12-error-codes.md)
