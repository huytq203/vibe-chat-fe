# 18 — Conversation Lock (Khoá hội thoại)

> Mỗi user có thể **khoá riêng** một conversation bằng password. Khi khoá:
> - Conversation **ẩn khỏi danh sách** — chỉ tìm lại qua `GET /conversations/locked`.
> - `lastMessage` trả `null` — không lộ preview nội dung.
> - Phải nhập đúng password mới mở được.
> - Unlock chỉ tồn tại trong phiên hiện tại — đóng app là phải nhập lại.

---

## Tổng quan flow

```
[User bật lock] → PUT /lock → conversation biến mất khỏi list
                                     ↓
[User muốn tìm lại] → GET /locked → danh sách các conv đang bị lock
                                     ↓
[User nhập password] → POST /lock/verify → { ok: true }
                                     ↓
[FE lưu session] → cho phép vào conversation trong phiên này
                                     ↓
[User muốn tắt lock] → DELETE /lock (kèm password hiện tại) → conv hiện lại
```

---

## Conversation object — field mới

`ConversationResponseDto` bây giờ có thêm field:

```ts
isLocked: boolean;   // true = user này đã lock conversation này
// Khi isLocked = true: lastMessage luôn là null (server ẩn preview)
```

---

## API

### 1. Bật lock / Đổi password

```http
PUT /api/v1/conversations/{id}/lock
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "password": "my-secret-123"
}
```

- `password`: 6–50 ký tự.
- **Idempotent** — gọi lại để đổi password cũ sang password mới.
- Response `200`: `ConversationResponseDto` với `isLocked: true`.
- Sau khi gọi thành công, conversation **không còn** xuất hiện trong `GET /conversations`.

### 2. Tắt lock

```http
DELETE /api/v1/conversations/{id}/lock
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "password": "my-secret-123"
}
```

- Phải nhập **đúng password hiện tại** để xác nhận.
- Response `200`: `{ "ok": true }`.
- Conversation **hiện lại** trong danh sách sau khi tắt.

### 3. Verify password (mở khoá session)

```http
POST /api/v1/conversations/{id}/lock/verify
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "password": "my-secret-123"
}
```

- **Không thay đổi** trạng thái lock — chỉ kiểm tra password.
- Response `200`: `{ "ok": true }`.
- FE tự lưu trạng thái "đã unlock" trong session memory (không gọi lại endpoint này cho đến khi app restart).

### 4. Danh sách conversation đang bị lock

```http
GET /api/v1/conversations/locked
Authorization: Bearer <accessToken>
```

- Trả array `ConversationResponseDto[]` với `isLocked: true`.
- `lastMessage` trong mỗi item là `null` (server không trả preview khi locked).
- Dùng để hiện "Kho bí mật" — section riêng biệt trong sidebar.

---

## Error codes

| Code | HTTP | Khi nào |
|---|---|---|
| `CONVERSATION_NOT_FOUND` | 404 | UUID sai hoặc không tồn tại |
| `CONVERSATION_MEMBER_REQUIRED` | 403 | Không phải thành viên ACTIVE |
| `CONVERSATION_LOCK_WRONG_PASSWORD` | 401 | Sai password |
| `CONVERSATION_NOT_LOCKED` | 400 | Gọi DELETE/verify khi conversation chưa bị lock |
| `VALIDATION_ERROR` | 400 | Password quá ngắn (< 6) hoặc quá dài (> 50) |

---

## Implement phía FE

### State management

```ts
// Lưu danh sách convId đã unlock trong session (in-memory, không persist)
const unlockedConversations = new Set<string>();

function isUnlocked(convId: string): boolean {
  return unlockedConversations.has(convId);
}

function markUnlocked(convId: string): void {
  unlockedConversations.add(convId);
}

// Khi app unmount / logout — clear toàn bộ
function clearUnlockSession(): void {
  unlockedConversations.clear();
}
```

### Bật lock

```ts
async function lockConversation(convId: string, password: string) {
  const response = await api.put(`/conversations/${convId}/lock`, { password });
  // Xoá khỏi conversation list store
  store.removeConversation(convId);
  // Thêm vào locked store
  store.addLockedConversation(response.data);
}
```

### Verify và vào conversation

```ts
async function openLockedConversation(convId: string) {
  // Đã unlock trong session này rồi → vào thẳng
  if (isUnlocked(convId)) {
    navigate(`/conversations/${convId}`);
    return;
  }

  // Hiện modal nhập password
  const password = await showPasswordModal();
  if (!password) return;

  try {
    await api.post(`/conversations/${convId}/lock/verify`, { password });
    markUnlocked(convId);
    navigate(`/conversations/${convId}`);
  } catch (err) {
    if (err.code === 'CONVERSATION_LOCK_WRONG_PASSWORD') {
      showToast('Sai mật khẩu, thử lại');
    } else if (err.code === 'CONVERSATION_NOT_LOCKED') {
      // Race condition — conv vừa được unlock bởi thiết bị khác
      navigate(`/conversations/${convId}`);
    }
  }
}
```

### Tắt lock

```ts
async function unlockConversation(convId: string, currentPassword: string) {
  try {
    await api.delete(`/conversations/${convId}/lock`, {
      data: { password: currentPassword },
    });
    // Xoá khỏi locked store, thêm lại vào conversation list
    store.removeLockedConversation(convId);
    store.addConversation(await api.get(`/conversations/${convId}`).then(r => r.data));
    showToast('Đã tắt khoá hội thoại');
  } catch (err) {
    if (err.code === 'CONVERSATION_LOCK_WRONG_PASSWORD') {
      showToast('Sai mật khẩu xác nhận');
    }
  }
}
```

### Load "Kho bí mật" khi mở app

```ts
async function loadLockedConversations() {
  const res = await api.get('/conversations/locked');
  store.setLockedConversations(res.data);
  // lastMessage của mỗi item là null — hiện placeholder trong UI
}
```

---

## UX gợi ý

### Sidebar — phân chia khu vực

```
┌─────────────────────────┐
│  💬 Cuộc trò chuyện     │
│  ─────────────────────  │
│  [conv A]               │
│  [conv B]               │
│  [conv C]               │
│                         │
│  🔒 Bí mật (2)          │  ← tap để mở phần này
│  ─────────────────────  │
│  [conv D — locked]      │  ← chỉ hiện tên, không có preview
│  [conv E — locked]      │
└─────────────────────────┘
```

### Conversation item khi locked

```tsx
function LockedConversationItem({ conv }: { conv: ConversationResponseDto }) {
  return (
    <div onClick={() => openLockedConversation(conv.id)}>
      <Avatar src={conv.avatarUrl} />
      <div>
        <span>{conv.name ?? 'Tin nhắn bí mật'}</span>
        <span className="muted">🔒 Nhấn để mở</span>
        {/* KHÔNG hiện lastMessage.preview — luôn null */}
      </div>
    </div>
  );
}
```

### Modal nhập password

```tsx
function LockPasswordModal({ onConfirm, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (password.length < 6) {
      setError('Password tối thiểu 6 ký tự');
      return;
    }
    onConfirm(password);
  }

  return (
    <Modal>
      <h3>🔒 Nhập mật khẩu</h3>
      <p>Hội thoại này được bảo vệ bằng mật khẩu.</p>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Nhập mật khẩu..."
        autoFocus
      />
      {error && <span className="error">{error}</span>}
      <button onClick={handleSubmit}>Mở</button>
      <button onClick={onCancel}>Huỷ</button>
    </Modal>
  );
}
```

### Bật lock từ settings conversation

```tsx
function ConversationSettings({ conv }) {
  async function handleToggleLock() {
    if (conv.isLocked) {
      // Tắt lock — yêu cầu nhập password cũ
      const password = await showPasswordModal({ title: 'Xác nhận mật khẩu hiện tại' });
      if (password) await unlockConversation(conv.id, password);
    } else {
      // Bật lock — yêu cầu đặt password mới
      const password = await showSetPasswordModal({
        title: 'Đặt mật khẩu khoá',
        hint: '6–50 ký tự',
      });
      if (password) await lockConversation(conv.id, password);
    }
  }

  return (
    <SettingsItem
      label={conv.isLocked ? '🔓 Tắt khoá hội thoại' : '🔒 Khoá hội thoại'}
      onClick={handleToggleLock}
    />
  );
}
```

---

## Lưu ý quan trọng

- **Per-user** — lock chỉ ảnh hưởng đến bạn. Người kia không biết bạn đã lock và vẫn thấy conversation của họ bình thường.
- **Session-only** — unlock không persist. Mỗi lần mở app cần nhập lại password khi muốn vào conversation đã lock.
- **Không cần gọi lại verify sau khi đã unlock** trong cùng phiên — chỉ cần kiểm tra `unlockedConversations.has(convId)`.
- **`lastMessage: null`** — khi `isLocked = true`, server không trả preview. Đừng render `conv.lastMessage?.preview` — sẽ crash nếu không check null.
- **Đổi password** — gọi `PUT /lock` với password mới là đủ (idempotent). Không cần xác nhận password cũ khi đổi (chỉ cần khi xoá lock).
- **Lock không gating API** — server KHÔNG chặn `GET /messages` nếu chưa verify. Lock chỉ là UI gate, FE phải tự enforce. Đừng hiển thị messages khi `isLocked && !isUnlocked(convId)`.

---

**Liên quan:**
- 💬 Danh sách conversation → [03-conversations.md](./03-conversations.md)
- 🔐 Mã hoá tin nhắn SERVER → [09-encryption.md](./09-encryption.md)
- 🔌 WebSocket events → [08-websocket.md](./08-websocket.md)
