# 08 — WebSocket Realtime

> Socket.io namespace `/chat`. Connect 1 lần sau login → nhận mọi event realtime.

---

## Connect

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: { token: accessToken },        // JWT từ /auth/login
  transports: ['websocket'],
  reconnection: true,
});

socket.on('connect', () => console.log('WS connected', socket.id));
socket.on('disconnect', (reason) => console.log('WS disconnect:', reason));
socket.on('error', (err) => console.error('WS error:', err));
```

> **Lưu ý**: namespace là `/chat` — KHÔNG phải root. Server tự join `userRoom(keycloakId)` để FE nhận noti riêng (không cần emit gì thêm).

### Reconnect khi refresh token

Khi access token được refresh (sau 15 phút) → phải re-connect WS với token mới:

```ts
socket.auth = { token: newAccessToken };
socket.disconnect().connect();
```

---

## Join / leave conversation

Trước khi gửi/nhận **tin nhắn realtime** của 1 conversation, **phải join room** của nó:

```ts
socket.emit('conversation:join', { conversationId: 'uuid-...' });
// có thể chờ ack: await socket.emitWithAck('conversation:join', {...})

socket.emit('conversation:leave', { conversationId: 'uuid-...' });
```

> Không join vẫn nhận được noti qua event `conversation:notify` (broadcast tới user room) — đủ để FE biết "có tin mới ở conv X" và refresh sidebar. Nhưng để nhận message stream realtime trong chat đang mở thì cần join.

---

## Gửi tin nhắn

### SERVER conv

```ts
const ack = await socket.emitWithAck('message:send', {
  conversationId: 'uuid-...',
  plaintext: 'Xin chào',                 // bắt buộc khi type=TEXT; caption optional khi gửi media
  clientNonce: crypto.randomUUID(),     // optional — xem 10-idempotency.md
  type: 'TEXT',
  attachmentIds: [/* 'media-uuid' */],   // optional — bắt buộc khi type là media; xem 14-media-upload.md
  mentions: [/* ... */],                 // optional
});
// ack: { ok: true, messageId: 'uuid-server-gen' }
// hoặc: { ok: false, code, error, message }
```

### E2E conv

```ts
const ack = await socket.emitWithAck('message:send:secret', {
  conversationId: 'uuid-...',
  encrypted: { ciphertext, iv, authTag, keyId, keyVersion },
  clientNonce: crypto.randomUUID(),
});
```

> Body giống REST `POST /messages` và `POST /secret-messages` — xem [04-messages.md](./04-messages.md).

---

## Nhận tin nhắn mới

```ts
// Nếu đã join room conversation
socket.on('message:new', (message /* MessageResponse */) => {
  // Append vào UI
});

// Conv chưa join (để biết có tin mới ở conv khác → reload sidebar)
socket.on('conversation:notify', ({ conversationId, message }) => {
  // Tăng unread badge / show notification
});
```

---

## Typing indicator

```ts
// Báo đang gõ
socket.emit('typing', { conversationId, state: 'start' });
// Báo dừng gõ (debounce 3s sau lần gõ cuối là chuẩn)
socket.emit('typing', { conversationId, state: 'stop' });

// Lắng nghe người khác đang gõ
socket.on('typing', ({ conversationId, userId, state }) => {
  // Hiện "abc đang nhập..." khi state==='start', ẩn khi 'stop'
});
```

---

## Read receipt

```ts
const ack = await socket.emitWithAck('message:read', {
  conversationId,
  messageId,
});

// Lắng nghe người khác đã đọc tin của mình
socket.on('message:read', ({ conversationId, messageId, userId, readAt }) => {
  // Hiện tick xanh / "Đã xem"
});
```

> Hoặc dùng REST `POST /messages/{id}/read` — kết quả tương đương.

---

## Sửa / Gỡ tin nhắn

```ts
// Gỡ (thu hồi) — người gửi, không giới hạn thời gian
await socket.emitWithAck('message:recall', { conversationId, messageId });

// Sửa SERVER conv (trong 5 phút) — gửi plaintext mới
await socket.emitWithAck('message:edit', { conversationId, messageId, plaintext: 'mới' });

// Sửa E2E conv (trong 5 phút) — gửi ciphertext mới
await socket.emitWithAck('message:edit:secret', {
  conversationId, messageId,
  encrypted: { ciphertext, iv, authTag, keyId, keyVersion },
});

// Lắng nghe tin bị gỡ → render "Tin nhắn đã được thu hồi"
socket.on('message:deleted', ({ conversationId, messageId, deletedBy, deletedAt }) => {
  store.markDeleted(messageId);
});

// Lắng nghe tin được sửa → cập nhật nội dung tại chỗ (payload = Message object đầy đủ)
socket.on('message:edited', (message /* MessageResponse */) => {
  store.upsertMessage(message);
});
```

> Chi tiết quy tắc (cửa sổ 5 phút, lỗi, tin tự huỷ) → [15-edit-recall-selfdestruct.md](./15-edit-recall-selfdestruct.md).

---

## Presence

Server lưu presence ở Redis với **TTL 60s per-socket** — FE **BẮT BUỘC** emit heartbeat mỗi 30s, nếu không socket bị auto-prune → user thành offline.

```ts
// Heartbeat 30s/lần — phải dùng emitWithAck để xử lý force-reconnect.
setInterval(async () => {
  try {
    const ack = await socket.emitWithAck('presence:heartbeat');
    if (ack?.reconnect) {
      // Socket đã bị server prune (heartbeat trễ quá lâu) → reconnect cho sạch state
      socket.disconnect().connect();
    }
  } catch {}
}, 30_000);

// Lắng nghe presence của user khác đổi trạng thái
socket.on('presence:update', ({ userId, isOnline, lastSeenAt, lastSeenLabel }) => {
  // Cập nhật chấm xanh online / text "X phút trước"
});
```

> Chi tiết presence + format label → [05-presence.md](./05-presence.md).

---

## Notification realtime

Server emit `notification:new` vào **user room** của recipient — FE không cần join thêm room, chỉ cần connect socket là tự lắng nghe được.

```ts
socket.on('notification:new', (n /* NotificationResponse */) => {
  store.prependNotification(n);
  incrementUnreadBadge();

  if (document.hasFocus()) {
    showInAppToast({ title: n.title, body: n.body });
  }
});

// Server tự mark read noti khi user xem nội dung gốc (đọc tin, accept request...)
// → emit event này để FE giảm badge ngay, KHÔNG cần gọi markRead thủ công.
socket.on('notification:cleared', ({ scope, conversationId, actorId, clearedCount }) => {
  unreadBadge = Math.max(0, unreadBadge - clearedCount);
  // ... remove khỏi list theo filter (xem 07-notifications.md)
});
```

> Shape `NotificationResponse` + auto-clear logic đầy đủ → [07-notifications.md](./07-notifications.md#auto-clear-notification).

---

## Friend update realtime

Server emit `friend:update` mỗi khi 1 trong 2 phía thực hiện action friend (send/accept/reject/cancel/unfriend). FE update list realtime, không cần refetch.

```ts
socket.on('friend:update', ({ type, otherUserId, status }) => {
  // type: REQUEST_SENT | REQUEST_ACCEPTED | REQUEST_REJECTED | REQUEST_CANCELLED | UNFRIENDED
  // status: PENDING_IN | PENDING_OUT | ACCEPTED | NONE  (góc nhìn của recipient)
  // otherUserId: user kia (không phải bản thân)
});
```

> Mapping action → event nhận được + handler đầy đủ → [06-friends-blocks.md](./06-friends-blocks.md#realtime--event-friendupdate).

---

## Conversation deleted

Emit khi conversation bị xoá. Với DIRECT + `scope="ME"`: chỉ người yêu cầu nhận. Với DIRECT + `scope="BOTH"` hoặc GROUP: tất cả member nhận.

```ts
socket.on('conversation:deleted', ({ conversationId, deletedBy, deletedAt }) => {
  store.removeConversation(conversationId);
  if (currentOpenConvId === conversationId) {
    closeChat();
    showToast('Cuộc trò chuyện đã bị xoá');
  }
});
```

> Xem chi tiết về `scope` → [03-conversations.md#xoá-conversation](./03-conversations.md#xoá-conversation).

---

## Conversation encryption changed

Emit khi có member (hoặc owner) switch chế độ mã hoá của conversation — xem [17-switch-encryption.md](./17-switch-encryption.md) để biết toàn bộ flow.

```ts
socket.on('conversation:encryption_changed', ({
  conversationId, encryptionType, encryptionKeyId, changedBy, at
}) => {
  store.updateConversation(conversationId, { encryptionType, encryptionKeyId });
  showToast(changedBy === myUserId
    ? `Bạn đã chuyển sang ${encryptionType === 'E2E' ? 'Secret Chat 🔒' : 'chat thường'}`
    : `Cuộc trò chuyện đã chuyển sang ${encryptionType === 'E2E' ? 'Secret Chat 🔒' : 'chat thường'}`
  );
});
```

---

## Group members & join requests

Chi tiết REST: [16-group-members.md](./16-group-members.md). Realtime:

```ts
// Có thành viên mới được thêm vào nhóm
socket.on('conversation:members_added', ({ conversationId, addedUserIds, addedBy }) => {
  store.refetchMembers(conversationId);
  // Nếu chính mình vừa được thêm → nhóm xuất hiện trong sidebar
});

// Có thành viên bị xoá (KICKED) hoặc tự rời (LEFT)
socket.on('conversation:member_removed', ({ conversationId, userId, reason }) => {
  if (userId === myUserId) {
    store.removeConversation(conversationId); // mình bị kick/đã rời
  } else {
    store.refetchMembers(conversationId);
  }
});

// (Chỉ OWNER/ADMIN/MODERATOR) có yêu cầu xin vào nhóm mới
socket.on('conversation:join_request', ({ conversationId, requestId, requesterId, reason }) => {
  store.incrementPendingJoinRequests(conversationId);
});

// (Người gửi) yêu cầu được duyệt / từ chối
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

## Bảng tổng hợp WS events

| Hướng | Event | Payload | Mô tả |
|---|---|---|---|
| C→S | `conversation:join` | `{ conversationId }` | Join room realtime |
| C→S | `conversation:leave` | `{ conversationId }` | Leave room |
| C→S | `message:send` | `WsSendServerMessage` | Gửi tin SERVER conv |
| C→S | `message:send:secret` | `WsSendSecretMessage` | Gửi tin E2E conv |
| C→S | `message:read` | `{ conversationId, messageId }` | Đánh dấu đọc |
| C→S | `message:recall` | `{ conversationId, messageId }` | Gỡ (thu hồi) tin. Ack `{ ok, messageId }` |
| C→S | `message:edit` | `{ conversationId, messageId, plaintext }` | Sửa tin SERVER (≤5 phút) |
| C→S | `message:edit:secret` | `{ conversationId, messageId, encrypted }` | Sửa tin E2E (≤5 phút) |
| C→S | `typing` | `{ conversationId, state }` | Báo đang/dừng gõ |
| C→S | `presence:heartbeat` | — | Giữ session online. Ack `{ ok, reconnect? }` — `reconnect=true` thì FE phải reconnect |
| S→C | `message:new` | `MessageResponse` | Có tin mới trong conv đang join |
| S→C | `conversation:notify` | `{ conversationId, message }` | Tin mới ở conv khác (không join room) |
| S→C | `message:read` | `{ conversationId, messageId, userId, readAt }` | User khác đã đọc |
| S→C | `message:deleted` | `{ conversationId, messageId, deletedBy, deletedAt }` | Tin bị gỡ — render placeholder |
| S→C | `message:edited` | `MessageResponse` | Tin được sửa — cập nhật nội dung |
| S→C | `typing` | `{ conversationId, userId, state }` | User khác đang gõ |
| S→C | `presence:update` | `{ userId, isOnline, lastSeenAt, lastSeenLabel }` | Trạng thái online đổi |
| S→C | `notification:new` | `NotificationResponse` | Có noti mới (friend request/accept, mention, message new) |
| S→C | `notification:cleared` | `{ scope, conversationId?, types?, actorId?, clearedCount }` | Server tự mark read noti — FE giảm badge ngay |
| S→C | `friend:update` | `{ type, otherUserId, status, at }` | Friend lifecycle (send/accept/reject/cancel/unfriend) |
| S→C | `conversation:deleted` | `{ conversationId, deletedBy, deletedAt }` | Conversation bị xoá — FE remove khỏi sidebar |
| S→C | `conversation:encryption_changed` | `{ conversationId, encryptionType, encryptionKeyId, changedBy, at }` | Chế độ mã hoá thay đổi — cập nhật store, hiện toast |
| S→C | `conversation:members_added` | `{ conversationId, addedUserIds, addedBy, at }` | Có thành viên mới — cập nhật member list |
| S→C | `conversation:member_removed` | `{ conversationId, userId, removedBy, reason, at }` | Member bị kick (`KICKED`) / rời (`LEFT`) — nếu là mình thì rời nhóm khỏi sidebar |
| S→C | `conversation:join_request` | `{ conversationId, requestId, requesterId, reason, at }` | (Admin) có yêu cầu vào nhóm mới |
| S→C | `conversation:join_request_resolved` | `{ conversationId, requestId, status, reviewedBy, at }` | (Người gửi) yêu cầu được duyệt/từ chối |
| S→C | `error` | `{ code, message }` | Lỗi (vd auth fail) — socket sẽ disconnect |

---

**Liên quan:**
- 🔐 JWT cho WS handshake → [01-authentication.md](./01-authentication.md#17-gửi-jwt-cho-websocket)
- 📨 Message shape → [04-messages.md](./04-messages.md#message-object--full-shape)
- 🔔 Notification shape → [07-notifications.md](./07-notifications.md#notification-object--full-shape)
