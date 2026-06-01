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

### Heartbeat từ FE — BẮT BUỘC mỗi 30s

Server lưu presence ở Redis với **TTL 60 giây per-socket**. Nếu FE không emit heartbeat → socket bị auto-prune sau 60s → user thành offline.

```ts
const HEARTBEAT_MS = 30_000;

setInterval(async () => {
  try {
    const ack = await socket.emitWithAck('presence:heartbeat');
    // Nếu server đã prune socket (vì heartbeat trễ quá lâu) → buộc reconnect.
    if (ack && ack.reconnect) {
      socket.disconnect().connect();
    }
  } catch {
    // ack timeout → để socket.io tự reconnect
  }
}, HEARTBEAT_MS);
```

> Ack shape: `{ ok: true }` hoặc `{ ok: false, reconnect: true }`. Khi `reconnect=true`, socket đã bị server force-disconnect — FE PHẢI `socket.connect()` lại để có entry presence mới.

### Sweep job server-side

Server chạy job mỗi 30s tự prune socket "im lặng" (FE ngừng heartbeat / tab kill đột ngột / mất mạng). Khi user mất hết socket → broadcast `presence:update` với `isOnline=false`. FE không cần làm gì thêm.

### Polling bổ sung (tuỳ chọn)

Định kỳ (vd 1 phút/lần) call lại `GET /presence?userIds=...` để refresh label cho các user không có WS event gần đây (tránh stale "5 phút trước" cứ ở yên).

---

## Cách BE detect offline

1. **Disconnect bình thường** (logout, refresh page) → WS disconnect event → server xoá socket khỏi Redis + Mongo ngay.
2. **Tab đóng đột ngột / mất mạng / kill browser** → Socket.IO `pingTimeout` ~45s phát hiện chết → disconnect.
3. **Server crash / FE ngừng heartbeat** → Redis TTL 60s tự expire socket → sweep job 30s tới sẽ broadcast `presence:update`.
4. Khi user mất hết socket → `isOnline = false`, server emit `presence:update` toàn namespace `/chat`.
5. FCM module dùng presence này để quyết định push khi có tin mới — xem [07-notifications.md](./07-notifications.md).

> **Boot clear**: mỗi lần backend restart, mọi `activeSockets` đều bị wipe → user nào không reconnect kịp sẽ thành offline cho đến khi WS connect lại. Tránh tình trạng "kẹt online" sau redeploy.

---

**Liên quan:**
- 🔌 `presence:heartbeat`, `presence:update` events → [08-websocket.md](./08-websocket.md#presence)
- 🔔 Offline → FCM push → [07-notifications.md](./07-notifications.md)
