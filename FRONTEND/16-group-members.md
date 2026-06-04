# 16 — Group Members & Join Requests

> Quản lý thành viên nhóm: **thêm thành viên trực tiếp**, **xin vào nhóm (có lý do)**, **duyệt / từ chối / huỷ** yêu cầu.

URL prefix: `/api/v1/conversations`. Tất cả endpoint require JWT.
Chỉ áp dụng cho `type` = `GROUP` / `CHANNEL` (gọi với DIRECT → `400 CONVERSATION_NOT_GROUP`).

---

## Phân quyền

| Vai trò (`member.role`) | Thêm member | Xem/duyệt/từ chối request |
|---|---|---|
| `OWNER`, `ADMIN`, `MODERATOR` | ✅ | ✅ |
| `MEMBER` | ❌ | ❌ |

Thiếu quyền → `403 CONVERSATION_INSUFFICIENT_ROLE`.

---

## 1. Thêm thành viên trực tiếp

Owner/Admin/Moderator thêm thẳng 1 hoặc nhiều user vào nhóm (không cần họ đồng ý).

```http
POST /api/v1/conversations/{id}/members
Authorization: Bearer ...
Content-Type: application/json

{
  "userIds": [
    "9d8b14cf-5392-452f-9ce3-557ded65d2d6",
    "550e8400-e29b-41d4-a716-446655440000"
  ]
}
```

- `userIds`: mảng keycloakId (UUID v4), 1–100 phần tử.
- User **đã là thành viên** ACTIVE → tự bỏ qua (không lỗi).
- User **từng rời nhóm** (LEFT/KICKED) → được kích hoạt lại.
- User **bị ban** (BANNED) → bị bỏ qua (không thêm).

Response `200`: trả về **Conversation object đầy đủ** (kèm `members[]` đã cập nhật) — xem [03-conversations.md](./03-conversations.md#conversation-object--full-shape).

### Lỗi

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_NOT_FOUND` | 404 | UUID sai / đã xoá |
| `CONVERSATION_NOT_GROUP` | 400 | Conversation là DIRECT |
| `CONVERSATION_MEMBER_REQUIRED` | 403 | Bạn không ở trong nhóm |
| `CONVERSATION_INSUFFICIENT_ROLE` | 403 | Bạn chỉ là MEMBER |
| `CONVERSATION_FULL` | 400 | Vượt `maxMembers` |
| `USER_NOT_FOUND` | 404 | Có userId không tồn tại trong hệ thống |

---

## 1b. Xoá (kick) thành viên

```http
DELETE /api/v1/conversations/{id}/members/{userId}
Authorization: Bearer ...
```

- Chỉ OWNER/ADMIN/MODERATOR, và **chỉ xoá được người có vai trò thấp hơn mình** (theo thứ hạng `OWNER > ADMIN > MODERATOR > MEMBER`).
- Không xoá được OWNER; không tự xoá mình (dùng [rời nhóm](#1c-rời-nhóm)).
- Người bị xoá có `status = KICKED` (vẫn có thể được add lại sau).

Response `200`: `{ "success": true, "data": { "ok": true } }`.

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_CANNOT_REMOVE_SELF` | 400 | Tự xoá mình → dùng rời nhóm |
| `CONVERSATION_TARGET_NOT_MEMBER` | 404 | userId không phải thành viên |
| `CONVERSATION_CANNOT_REMOVE_OWNER` | 403 | Cố xoá chủ nhóm |
| `CONVERSATION_INSUFFICIENT_ROLE` | 403 | Xoá người ngang/cao hơn vai trò |

## 1c. Rời nhóm

```http
POST /api/v1/conversations/{id}/leave
Authorization: Bearer ...
```

- Bất kỳ thành viên nào cũng tự rời được (`status = LEFT`).
- **OWNER không rời được** → phải chuyển quyền hoặc xoá nhóm (`DELETE /conversations/:id`).

Response `200`: `{ "success": true, "data": { "ok": true } }`.

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_OWNER_CANNOT_LEAVE` | 403 | Owner cố rời nhóm |
| `CONVERSATION_MEMBER_REQUIRED` | 403 | Không phải thành viên |
| `CONVERSATION_NOT_GROUP` | 400 | Gọi trên DIRECT (dùng xoá) |

> Cả kick lẫn leave đều phát realtime event `conversation:member_removed` (xem [mục Realtime](#realtime-websocket)).

---

## 2. Xin vào nhóm (Join Request)

User ngoài tự gửi yêu cầu xin vào nhóm. **Chỉ nhóm công khai** (`isPublic = true`) mới nhận yêu cầu — nhóm riêng tư bắt buộc được mời / add.

```http
POST /api/v1/conversations/{id}/join-requests
Authorization: Bearer ...
Content-Type: application/json

{
  "reason": "Mình là đồng nghiệp phòng Kỹ thuật, muốn tham gia trao đổi."
}
```

- `reason`: **optional**, tối đa 300 ký tự. Người duyệt sẽ đọc lý do này.

Response `201`: `JoinRequest` object (xem [shape](#joinrequest-object)).

### Lỗi

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_NOT_FOUND` | 404 | UUID sai / đã xoá |
| `CONVERSATION_NOT_GROUP` | 400 | Conversation là DIRECT |
| `CONVERSATION_NOT_PUBLIC` | 403 | Nhóm riêng tư — không nhận yêu cầu |
| `CONVERSATION_MEMBER_EXISTS` | 409 | Bạn đã là thành viên |
| `CONVERSATION_MEMBER_BANNED` | 403 | Bạn đã bị cấm khỏi nhóm |
| `JOIN_REQUEST_ALREADY_EXISTS` | 409 | Bạn đã gửi yêu cầu (đang chờ duyệt) |

> Một user chỉ có **tối đa 1 request PENDING** cho mỗi nhóm.

---

## 3. Danh sách yêu cầu chờ duyệt (cho admin)

```http
GET /api/v1/conversations/{id}/join-requests?page=1&limit=20
```

Chỉ OWNER/ADMIN/MODERATOR. Trả các request `status = PENDING`, mới nhất trước. Mỗi item có thêm `requester` (thông tin người gửi để hiển thị).

```json
{
  "success": true,
  "data": [
    {
      "id": "f1c0...-uuid",
      "conversationId": "e7b5...-uuid",
      "status": "PENDING",
      "reason": "Mình là đồng nghiệp...",
      "requester": {
        "userId": "9d8b14cf-...",
        "username": "huytq",
        "displayName": "Huy",
        "avatarUrl": null
      },
      "reviewedBy": null,
      "reviewedAt": null,
      "createdAt": "2026-06-03T08:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

---

## 4. Chấp nhận yêu cầu

```http
POST /api/v1/conversations/{id}/join-requests/{requestId}/accept
```

→ Thêm người gửi làm thành viên (role `MEMBER`), chuyển request sang `ACCEPTED`.
Response `200`: `JoinRequest` object (`status = "ACCEPTED"`).

| Code | HTTP | Khi nào |
|---|---|---|
| `JOIN_REQUEST_NOT_FOUND` | 404 | requestId sai / không thuộc nhóm |
| `JOIN_REQUEST_NOT_PENDING` | 409 | Đã duyệt/từ chối/huỷ trước đó |
| `CONVERSATION_FULL` | 400 | Nhóm đã đầy |
| `CONVERSATION_MEMBER_BANNED` | 403 | User này đã bị ban |

## 5. Từ chối yêu cầu

```http
POST /api/v1/conversations/{id}/join-requests/{requestId}/reject

{ "reason": "Nhóm chỉ dành cho team nội bộ" }   // optional
```

Response `200`: `JoinRequest` (`status = "REJECTED"`). Lỗi giống mục 4 (`JOIN_REQUEST_NOT_FOUND`, `JOIN_REQUEST_NOT_PENDING`).

## 6. Huỷ yêu cầu của chính mình

Người gửi tự rút lại yêu cầu khi còn PENDING.

```http
DELETE /api/v1/conversations/{id}/join-requests/{requestId}
```

Response `200`: `JoinRequest` (`status = "CANCELLED"`).

| Code | HTTP | Khi nào |
|---|---|---|
| `JOIN_REQUEST_NOT_FOUND` | 404 | requestId sai |
| `JOIN_REQUEST_NOT_OWNER` | 403 | Không phải yêu cầu của bạn |
| `JOIN_REQUEST_NOT_PENDING` | 409 | Đã được xử lý |

---

## Realtime (WebSocket)

Xem chi tiết ở [08-websocket.md](./08-websocket.md). Tóm tắt event S→C liên quan:

| Event | Gửi cho | Payload | FE làm gì |
|---|---|---|---|
| `conversation:members_added` | Member trong nhóm + người mới được thêm | `{ conversationId, addedUserIds, addedBy, at }` | Cập nhật danh sách member; người mới: thêm nhóm vào sidebar |
| `conversation:member_removed` | Member trong nhóm + người bị xoá | `{ conversationId, userId, removedBy, reason, at }` | `reason`=`KICKED`/`LEFT`. Nếu `userId` là mình → rời nhóm khỏi sidebar; nếu không → cập nhật member list |
| `conversation:join_request` | Người duyệt (OWNER/ADMIN/MOD) | `{ conversationId, requestId, requesterId, reason, at }` | Tăng badge "yêu cầu chờ duyệt", refetch list |
| `conversation:join_request_resolved` | Người gửi yêu cầu | `{ conversationId, requestId, status, reviewedBy, at }` | Show toast được duyệt/từ chối; nếu `ACCEPTED` → thêm nhóm vào sidebar |

```ts
socket.on('conversation:member_removed', ({ conversationId, userId, reason }) => {
  if (userId === currentUserId) {
    store.removeConversation(conversationId); // mình bị kick / vừa rời
    if (currentOpenConvId === conversationId) closeChat();
  } else {
    store.refetchMembers(conversationId);
  }
});

socket.on('conversation:join_request', ({ conversationId, requesterId, reason }) => {
  store.incrementPendingJoinRequests(conversationId);
});

socket.on('conversation:join_request_resolved', ({ conversationId, status }) => {
  if (status === 'ACCEPTED') {
    showToast('Bạn đã được duyệt vào nhóm');
    store.refetchConversations();
  } else {
    showToast('Yêu cầu vào nhóm bị từ chối');
  }
});
```

---

## JoinRequest object

| Field | Type | Mô tả |
|---|---|---|
| `id` | UUID | public ID của request (dùng cho accept/reject/cancel) |
| `conversationId` | UUID | nhóm liên quan |
| `status` | `'PENDING'\|'ACCEPTED'\|'REJECTED'\|'CANCELLED'` | trạng thái |
| `reason` | `string\|null` | lý do xin vào (hoặc lý do từ chối sau khi reject) |
| `requester` | object\|null | thông tin người gửi — **chỉ có ở endpoint list** (mục 3) |
| `reviewedBy` | UUID keycloakId\|null | người duyệt/từ chối |
| `reviewedAt` | ISO date\|null | thời điểm xử lý |
| `createdAt` | ISO date | thời điểm gửi |

---

**Liên quan:**
- 💬 CRUD conversation → [03-conversations.md](./03-conversations.md)
- 🔌 Realtime events → [08-websocket.md](./08-websocket.md)
- ⚠️ Tra mã lỗi → [12-error-codes.md](./12-error-codes.md)
