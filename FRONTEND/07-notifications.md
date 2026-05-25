# 07 — Notifications (Inbox + FCM token API)

> Quản lý FCM token + notification inbox. Đây là API spec — phần **setup Firebase FE end-to-end** xem [11-push-fcm.md](./11-push-fcm.md).

URL prefix: `/api/v1/notifications`. Require JWT.

---

## Notification được tạo cho 5 loại event

| `type` | Khi nào | Push FCM | Realtime WS |
|---|---|---|---|
| `FRIEND_REQUEST_RECEIVED` | Ai đó gửi lời mời kết bạn | ✅ luôn (kể cả online) | ✅ `notification:new` |
| `FRIEND_REQUEST_ACCEPTED` | Lời mời của bạn được accept | ✅ luôn | ✅ |
| `MESSAGE_MENTION` | Bạn bị `@tag` trong group | ✅ luôn | ✅ |
| `MESSAGE_NEW` | Có tin mới ở conv bạn là member | 🟡 chỉ khi **bạn offline** | ✅ |
| `CONVERSATION_DELETED` | (reserved, hiện chưa generate) | — | — |

> Logic: Online → đã thấy realtime trong app → không cần FCM. Offline → FCM nhảy badge ngoài hệ điều hành. Mention/friend luôn push để badge bật ngay kể cả app đang focus.

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

**Liên quan:**
- 🔥 Setup Firebase + Service Worker → [11-push-fcm.md](./11-push-fcm.md)
- 🔌 WS event `notification:new` → [08-websocket.md](./08-websocket.md)
- 👥 Friend events trigger notification → [06-friends-blocks.md](./06-friends-blocks.md)
- 📨 Mention trong tin nhắn → [04-messages.md](./04-messages.md#mention-user--workflow-đầy-đủ)
