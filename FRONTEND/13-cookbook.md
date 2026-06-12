# 13 — Cookbook (flow hoàn chỉnh)

> Các flow phổ biến copy-paste được. Chi tiết từng API có ở các file riêng — file này tập trung vào **trình tự gọi**.

---

## 13.1. Flow đăng nhập + tải danh sách chat

```ts
// 1. Login qua backend (KHÔNG gọi Keycloak trực tiếp)
const loginRes = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',                      // ← để nhận refresh cookie
  body: JSON.stringify({ username, password }),
});
const { data } = await loginRes.json();
const accessToken = data.tokens.accessToken;   // giữ trong memory
const me = data.user;                          // đã có sẵn user info; hồ sơ chat đầy đủ lấy ở GET /users/me (xem 24-profile.md)

// 2. Connect WebSocket
const socket = io('/chat', { auth: { token: accessToken } });

// 3. Setup FCM push (xem 11-push-fcm.md)
await setupPush(accessToken);

// 4. Load danh sách conversation
const convs = await fetch('/api/v1/conversations?limit=20', {
  headers: { Authorization: `Bearer ${accessToken}` },
  credentials: 'include',
}).then(r => r.json());

// 5. Render sidebar + lắng nghe noti realtime
socket.on('notification:new', (n) => incrementBadge(n));
socket.on('conversation:deleted', ({ conversationId }) => removeFromSidebar(conversationId));
```

**Auto-refresh khi access token hết hạn** (15 phút):

```ts
function scheduleRefresh(expiresInSeconds: number) {
  // refresh sớm 1 phút trước khi expire
  const delayMs = (expiresInSeconds - 60) * 1000;
  setTimeout(async () => {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    const { data } = await res.json();
    accessToken = data.accessToken;
    // Reconnect WS với token mới
    socket.auth = { token: accessToken };
    socket.disconnect().connect();
    scheduleRefresh(data.expiresIn);            // schedule cycle tiếp
  }, delayMs);
}
```

---

## 13.2. Mở chat + gửi tin nhắn

```ts
// 1. Click vào 1 conversation
const conv = convs.data[0];

// 2. Join WS room
socket.emit('conversation:join', { conversationId: conv.id });

// 3. Load history
const history = await fetch(
  `/api/v1/conversations/${conv.id}/messages?limit=20`,
  { headers: { Authorization: `Bearer ${accessToken}` } }
).then(r => r.json());

// 4. Lắng nghe tin mới
socket.on('message:new', (msg) => {
  if (msg.conversationId === conv.id) {
    appendMessage(msg);
  }
});

// 5. Gửi tin
const nonce = crypto.randomUUID();
if (conv.encryptionType === 'SERVER') {
  socket.emit('message:send', {
    conversationId: conv.id,
    plaintext: 'Xin chào!',
    clientNonce: nonce,
  });
} else {
  const encrypted = await encryptMessage('Xin chào!', getKey(conv.id));
  socket.emit('message:send:secret', {
    conversationId: conv.id,
    encrypted,
    clientNonce: nonce,
  });
}
```

---

## 13.3. Optimistic UI

```ts
async function sendOptimistic(text: string, conv: Conversation) {
  const nonce = crypto.randomUUID();
  const tempId = `temp-${nonce}`;

  // 1. Append local trước (UI hiển thị ngay)
  appendMessage({
    id: tempId,
    senderId: me.id,
    plaintext: text,
    createdAt: new Date().toISOString(),
    status: 'sending',          // local-only field
  });

  try {
    const res = await fetch(`/api/v1/conversations/${conv.id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plaintext: text, clientNonce: nonce }),
    });
    const { data } = await res.json();

    // 2. Replace temp message với data thật từ server
    replaceMessage(tempId, { ...data, status: 'sent' });
  } catch (e) {
    // 3. Mark failed, hiển thị nút retry
    updateMessage(tempId, { status: 'failed', nonce });
  }
}

// Retry: gọi lại API với cùng nonce — server idempotent
```

---

## 13.4. Pagination message (kéo lên load thêm)

```ts
async function loadOlder(conv: Conversation, oldestCursor: string | null) {
  if (!oldestCursor) return;     // hết tin
  const res = await fetch(
    `/api/v1/conversations/${conv.id}/messages?limit=20&before=${oldestCursor}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { data, meta } = await res.json();
  prependMessages(data);          // chèn lên đầu list (vì sort desc)
  return meta.nextCursor;          // dùng cho lần next
}
```

---

## 13.5. Hiển thị badge unread

```ts
// Lúc load danh sách conv:
conv.unreadCount  // → render badge

// Khi nhận WS event conversation:notify (tin ở conv chưa join):
socket.on('conversation:notify', ({ conversationId }) => {
  incrementUnreadBadge(conversationId);
});

// Khi user mở conv + đọc tin:
socket.emit('message:read', {
  conversationId: conv.id,
  messageId: latestMessage.id,
});
// → backend reset unreadCount + broadcast read receipt
clearUnreadBadge(conv.id);
```

---

## 13.6. Flow kết bạn — từ search đến chat

```ts
// 1. Search user theo keyword
const q = 'huy';
const res = await fetch(`/api/v1/users/search?q=${encodeURIComponent(q)}&limit=20`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { data } = await res.json();    // { items, nextCursor }

// 2. Render. Tuỳ friendship để hiện nút.
data.items.forEach((u) => {
  switch (u.friendship) {
    case 'NONE':         renderButton('Kết bạn',    () => sendRequest(u.id)); break;
    case 'PENDING_OUT':  renderButton('Huỷ lời mời', () => cancelRequest(u.id)); break;
    case 'PENDING_IN':   renderButton('Chấp nhận',  () => acceptRequest(u.id)); break;
    case 'ACCEPTED':     renderButton('Nhắn tin',   () => openDirectChat(u.id)); break;
    case 'BLOCKED_BY_ME': renderButton('Bỏ chặn',   () => unblock(u.id)); break;
  }
});

// 3. Gửi lời mời
async function sendRequest(targetUserId: string) {
  const res = await fetch('/api/v1/friends/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetUserId, source: 'SEARCH' }),
  });
  const { data, error } = await res.json();
  if (error) return handleFriendError(error);

  // ⚠️ Có thể server auto-accept nếu target đã mời mình trước → kiểm status
  if (data.status === 'ACCEPTED') {
    showToast('Đã trở thành bạn bè 🎉');
  } else {
    showToast('Đã gửi lời mời');
  }
  updateUserCardStatus(targetUserId, data.status);
}

// 4. Mở chat 1-1 sau khi accept
async function openDirectChat(friendUserId: string) {
  const res = await fetch('/api/v1/conversations/direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId: friendUserId }),
  });
  const { data } = await res.json();
  navigateToConversation(data.id);    // conversation đã tồn tại hoặc vừa tạo
}
```

---

## 13.7. Notification lời mời đến (realtime)

Từ v1.1, có realtime — **không cần polling**:

```ts
// 1. Initial load
async function loadIncomingOnAppOpen() {
  const [reqRes, countRes] = await Promise.all([
    fetch('/api/v1/friends/requests/incoming?limit=20', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch('/api/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);
  const requests = (await reqRes.json()).data;
  const { unreadCount } = (await countRes.json()).data;
  setIncomingBadge(requests.items.length);
  setNotificationBadge(unreadCount);
}

// 2. Realtime — push tự đến qua WS
socket.on('notification:new', (n) => {
  if (n.type === 'FRIEND_REQUEST_RECEIVED') {
    incrementIncomingBadge();
    showToast(`${n.data?.actorName} muốn kết bạn`);
    refetchIncomingList();      // hoặc prepend optimistic
  }
  if (n.type === 'FRIEND_REQUEST_ACCEPTED') {
    showToast(`${n.data?.actorName} đã chấp nhận lời mời`);
    refetchFriendList();
  }
});
```

---

## 13.8. Mention `@user` trong group

```ts
// 1. User gõ '@' → show suggest list từ member của conv
const conv = await fetch(`/api/v1/conversations/${convId}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json()).then(b => b.data);

const memberCandidates = conv.members.filter(m => m.userId !== me.id);
showMentionPopup(memberCandidates);

// 2. User chọn @huy → FE chèn text + track offset
const text = 'Hey @huy chú ý nhé';
const mentions = [
  { userId: 'uuid-của-huy', startOffset: 4, length: 4 },
];

// 3. Gửi
await fetch(`/api/v1/conversations/${conv.id}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ plaintext: text, mentions, clientNonce: crypto.randomUUID() }),
});

// 4. Người được tag sẽ nhận:
//    - WS: 'notification:new' với type 'MESSAGE_MENTION'
//    - FCM push (kể cả đang online)
//    Click noti → mở /conversations/{convId}
```

---

## 13.9. Xoá conversation (owner thao tác)

```ts
async function deleteConversation(convId: string) {
  const ok = confirm('Xoá vĩnh viễn cuộc trò chuyện này?');
  if (!ok) return;

  const res = await fetch(`/api/v1/conversations/${convId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const { error } = await res.json();
    if (error.code === 'CONVERSATION_NOT_OWNER') {
      return toast.error('Chỉ chủ nhóm mới được xoá');
    }
    return toast.error(error.message);
  }

  // Không cần update UI ngay — server sẽ emit 'conversation:deleted' WS,
  // handler chung đã xoá khỏi sidebar + đóng tab.
}
```

---

## 13.10. Logout đầy đủ

```ts
async function logoutFull() {
  // 1. Xoá FCM token TRƯỚC (cần access token còn hiệu lực)
  await removeFcmToken();

  // 2. Disconnect WS
  socket.disconnect();

  // 3. Logout backend
  await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 4. Clear local state
  accessToken = null;
  store.reset();

  // 5. Redirect
  window.location.href = '/login';
}
```

---

**Các file API spec chi tiết:**
- [01-authentication.md](./01-authentication.md) · [03-conversations.md](./03-conversations.md) · [04-messages.md](./04-messages.md)
- [06-friends-blocks.md](./06-friends-blocks.md) · [07-notifications.md](./07-notifications.md) · [11-push-fcm.md](./11-push-fcm.md)
