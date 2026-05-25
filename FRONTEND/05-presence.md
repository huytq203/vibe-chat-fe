# 05 — Presence & Online Status

> Lấy trạng thái online + label "X phút trước" của user. Server đã format sẵn tiếng Việt — FE chỉ việc hiển thị.

URL prefix: `/api/v1/presence`. Require JWT.

---

## 1 user

```http
GET /api/v1/presence/{userId}
```

```json
{
  "success": true,
  "data": {
    "userId": "...",
    "isOnline": false,
    "lastSeenAt": "2026-05-15T10:30:00Z",
    "lastSeenLabel": "5 phút trước"     // null nếu > 3 giờ
  }
}
```

## Nhiều user (bulk)

```http
GET /api/v1/presence?userIds=user1,user2,user3
```

Response: `data: PresenceResponse[]`.

---

## Cách hiển thị `lastSeenLabel`

Server đã tự **format label tiếng Việt** — FE chỉ việc hiển thị `lastSeenLabel`.

| Trạng thái | `lastSeenLabel` | FE hiển thị |
|---|---|---|
| Đang online | `"Đang hoạt động"` | Chấm xanh + text |
| Offline < 1 phút | `"Vừa truy cập"` | Text |
| Offline 1–59 phút | `"5 phút trước"` | Text |
| Offline 1–2 giờ | `"2 giờ trước"` | Text |
| Offline ≥ 3 giờ | `null` | **KHÔNG hiển thị gì** |

FE tuyệt đối **không tự format** từ `lastSeenAt` raw. Lấy `lastSeenLabel`, nếu `null` thì ẩn.

```tsx
function PresenceBadge({ presence }: { presence: PresenceResponse }) {
  if (!presence.lastSeenLabel) return null;   // ẩn nếu > 3h
  return (
    <span className={presence.isOnline ? 'online' : 'offline'}>
      {presence.isOnline && <span className="dot-green" />}
      {presence.lastSeenLabel}
    </span>
  );
}
```

---

## Cập nhật realtime qua WS

Lắng nghe event `presence:update` để cập nhật label live mà không cần refresh:

```ts
socket.on('presence:update', ({ userId, isOnline, lastSeenAt, lastSeenLabel }) => {
  store.updateUserPresence(userId, { isOnline, lastSeenLabel });
});
```

### Heartbeat từ FE

Server đã tự set online lúc WS connect. Nếu socket idle dài, gửi heartbeat 30s/lần để giữ `lastSeenAt` luôn fresh:

```ts
setInterval(() => socket.emit('presence:heartbeat'), 30_000);
```

### Polling bổ sung

Định kỳ (vd 1 phút/lần) call lại `GET /presence?userIds=...` để refresh label cho các user không có WS event gần đây (tránh stale "5 phút trước" cứ ở yên).

---

## Cách BE detect offline

1. User tắt tab → WS disconnect → server xoá socket khỏi `activeSockets[]` của user presence.
2. Nếu user hết socket → `isOnline = false`, broadcast `presence:update`.
3. FCM module dùng presence này để quyết định push khi có tin mới — xem [07-notifications.md](./07-notifications.md).

---

**Liên quan:**
- 🔌 `presence:heartbeat`, `presence:update` events → [08-websocket.md](./08-websocket.md#presence)
- 🔔 Offline → FCM push → [07-notifications.md](./07-notifications.md)
