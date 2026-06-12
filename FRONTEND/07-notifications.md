# 07 — Notifications (Inbox + FCM token API)

> Quản lý FCM token + notification inbox. Đây là API spec — phần **setup Firebase FE end-to-end** xem [11-push-fcm.md](./11-push-fcm.md).

URL prefix: `/api/v1/notifications`. Require JWT.

---

## Các loại notification

| `type` | Khi nào | Push FCM | Realtime WS | Có trong inbox |
|---|---|---|---|---|
| `FRIEND_REQUEST_RECEIVED` | Ai đó gửi lời mời kết bạn | ✅ luôn (kể cả online) | ✅ `notification:new` | ✅ |
| `FRIEND_REQUEST_ACCEPTED` | Lời mời của bạn được accept | ✅ luôn | ✅ | ✅ |
| `MESSAGE_MENTION` | Bạn bị `@tag` trong group | ✅ luôn | ✅ | ✅ |
| `MESSAGE_NEW` | Có tin mới ở conv bạn là member | 🟡 chỉ tới **device không online** | ✅ | ✅ |
| `CALL_INCOMING` | Cuộc gọi đến khi bạn offline | ✅ (đánh thức device) | — | ❌ **transient — KHÔNG lưu**, đừng render vào inbox |
| `CALL_MISSED` | Cuộc gọi nhỡ (không bắt máy) | ✅ luôn | ✅ | ✅ |
| `CONVERSATION_DELETED` | (reserved, hiện chưa generate) | — | — | — |

> Logic push `MESSAGE_NEW` (từ 06/2026): lọc theo **device** chứ không theo user —
> bạn online trên WEB thì token WEB không được push, nhưng token ANDROID/IOS của
> cùng tài khoản **vẫn nhận push**. FE mobile nên tự bỏ qua/im lặng noti của
> conversation đang mở. Mention/friend luôn push mọi device để badge bật ngay.

---

## FCM Token CRUD

### Đăng ký FCM token

Gọi NGAY SAU khi:
1. User login thành công.
2. User grant permission `Notification.permission === 'granted'`.
3. Firebase SDK trả token.

```http
POST /api/v1/notifications/fcm-tokens
Authorization: Bearer ...
Content-Type: application/json

{
  "token": "fSx8...registration-token...",
  "deviceType": "WEB",                   // WEB | IOS | ANDROID | DESKTOP — default WEB
  "userAgent": "Mozilla/5.0 ..."         // optional
}
```

Response `201`: `{ "data": { "ok": true } }`.

- **Idempotent**: cùng `token` gọi lại không tạo bản ghi trùng. Đổi tài khoản trên cùng device → token tự gắn về user mới.
- Token tối thiểu 20 ký tự, tối đa 4096.

> 🛠️ Setup Firebase SDK FE để lấy token — xem [11-push-fcm.md](./11-push-fcm.md).

### Xoá FCM token

Gọi khi user logout / tắt notification setting / SW báo token expired:

```http
DELETE /api/v1/notifications/fcm-tokens
Authorization: Bearer ...
Content-Type: application/json

{ "token": "fSx8..." }
```

> Server cũng **tự xoá** token gặp lỗi `messaging/registration-token-not-registered` khi push — FE không cần lo cleanup phía server.

---

## Inbox API

### List notification

```http
GET /api/v1/notifications?page=1&limit=20&unreadOnly=false
Authorization: Bearer ...
```

Query params:
| Tên | Default | Ghi chú |
|---|---|---|
| `page` | 1 | ≥ 1 |
| `limit` | 20 | 1–100 |
| `unreadOnly` | false | `true` chỉ lấy noti chưa đọc |

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "a3e5c4d8-...",
      "type": "FRIEND_REQUEST_ACCEPTED",
      "recipientId": "<keycloakId của bạn>",
      "actorId": "<keycloakId của người gây hành động>",
      "title": "Lời mời được chấp nhận",
      "body": "Trần Quang Huy đã chấp nhận lời mời kết bạn của bạn",
      "conversationId": null,
      "messageId": null,
      "data": { "actorName": "Trần Quang Huy" },
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-05-25T08:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "totalPages": 5,
    "unreadCount": 12
  }
}
```

> `data` chứa context tuỳ type. Vd `MESSAGE_MENTION` có `{ senderName }`. FE đọc `type` để chọn icon/route khi click.

### Badge unread

```http
GET /api/v1/notifications/unread-count
```

```json
{ "success": true, "data": { "unreadCount": 12 } }
```

> Có thể gọi 1 lần lúc app khởi động → sau đó **cập nhật incremental qua WS** (`notification:new` tăng, FE tự decrement khi gọi `markRead`).

### Đánh dấu đã đọc

```http
POST /api/v1/notifications/{id}/read
Authorization: Bearer ...
```

`{id}` là `notification.id`. Response `{ ok: true }`.

### Đánh dấu tất cả đã đọc

```http
POST /api/v1/notifications/read-all
```

```json
{ "success": true, "data": { "updated": 12 } }
```

### Xoá 1 notification

```http
DELETE /api/v1/notifications/{id}
```

Response `{ ok: true }`. Lỗi `NOTIFICATION_NOT_FOUND` (404) nếu không tồn tại hoặc không thuộc user hiện tại.

---

## Notification object — full shape

```ts
{
  id: string;                  // UUID v4
  type:
    | 'FRIEND_REQUEST_RECEIVED'
    | 'FRIEND_REQUEST_ACCEPTED'
    | 'MESSAGE_NEW'
    | 'MESSAGE_MENTION'
    | 'CONVERSATION_DELETED';
  recipientId: string;         // keycloakId — luôn là user hiện tại
  actorId: string | null;      // người gây hành động
  title: string;               // tiêu đề push
  body: string | null;         // nội dung push
  conversationId: string | null;   // UUID — dùng cho deep link
  messageId: string | null;        // UUID
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;       // ISO date
  createdAt: string;           // ISO date
}
```

---

## Lắng nghe realtime

```ts
socket.on('notification:new', (n /* NotificationResponse */) => {
  store.prependNotification(n);
  incrementUnreadBadge();

  // Tuỳ type → toast in-app nếu tab đang focus
  if (document.hasFocus()) {
    showInAppToast({
      title: n.title,
      body: n.body,
      onClick: () => navigateByNotification(n),
    });
  }
});

function navigateByNotification(n) {
  switch (n.type) {
    case 'MESSAGE_NEW':
    case 'MESSAGE_MENTION':
      return router.push(`/conversations/${n.conversationId}`);
    case 'FRIEND_REQUEST_RECEIVED':
      return router.push('/friends/requests');
    case 'FRIEND_REQUEST_ACCEPTED':
      return router.push('/friends');
  }
}
```

> Chi tiết WS realtime → [08-websocket.md](./08-websocket.md#notification-realtime).

---

## Auto-clear notification

Khi user đã thực sự xem nội dung gốc (đọc tin nhắn / accept lời mời / mở trang lời mời), server **tự mark read** các notification liên quan và emit event `notification:cleared` để FE giảm badge ngay — FE KHÔNG phải gọi `markRead` cho từng noti.

### Trigger từ phía server

| User action | Endpoint / sự kiện | Noti được mark read |
|---|---|---|
| Đọc 1 tin nhắn | `POST /messages/{id}/read` hoặc WS `message:read` | Tất cả `MESSAGE_NEW` + `MESSAGE_MENTION` của conversation đó |
| Accept lời mời | `POST /friends/requests/{actorId}/accept` | `FRIEND_REQUEST_RECEIVED` từ actor đó |
| Reject lời mời | `POST /friends/requests/{actorId}/reject` | `FRIEND_REQUEST_RECEIVED` từ actor đó |
| Sender cancel lời mời | `DELETE /friends/requests/{targetId}` | (cho **target**) `FRIEND_REQUEST_RECEIVED` từ viewer |
| Mở trang Lời mời (page đầu, không cursor) | `GET /friends/requests/incoming` | Tất cả `FRIEND_REQUEST_RECEIVED` của viewer |

### Payload `notification:cleared`

```ts
{
  scope: 'conversation' | 'friendRequest',
  conversationId?: string,    // có khi scope='conversation'
  types?: string[],           // ['MESSAGE_NEW', 'MESSAGE_MENTION']
  actorId?: string,           // có khi clear theo actor cụ thể
  clearedCount: number,       // số noti vừa mark read — dùng decrement badge
}
```

### Handler mẫu

```ts
socket.on('notification:cleared', ({ scope, conversationId, types, actorId, clearedCount }) => {
  // Giảm badge tổng
  unreadBadge = Math.max(0, unreadBadge - clearedCount);

  // Remove khỏi list noti theo filter
  if (scope === 'conversation' && conversationId) {
    store.markReadWhere(n =>
      n.conversationId === conversationId &&
      (!types || types.includes(n.type))
    );
  }

  if (scope === 'friendRequest') {
    store.markReadWhere(n =>
      n.type === 'FRIEND_REQUEST_RECEIVED' &&
      (!actorId || n.actorId === actorId)
    );
  }
});
```

> Server **không xoá** doc notification — chỉ set `isRead=true + readAt=now`. History vẫn còn trong inbox cho user xem lại.

---

**Liên quan:**
- 🔥 Setup Firebase + Service Worker → [11-push-fcm.md](./11-push-fcm.md)
- 🔌 WS event `notification:new` → [08-websocket.md](./08-websocket.md)
- 👥 Friend events trigger notification → [06-friends-blocks.md](./06-friends-blocks.md)
- 📨 Mention trong tin nhắn → [04-messages.md](./04-messages.md#mention-user--workflow-đầy-đủ)
