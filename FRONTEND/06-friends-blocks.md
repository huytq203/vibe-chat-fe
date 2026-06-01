# 06 — Friends, Search & Blocks

> Tìm user, gửi/nhận lời mời kết bạn, chặn. Tất cả ID là **Keycloak UUID** (= `user.id`).

3 phần:
- [Search](#search-user-để-kết-bạn)
- [Friends](#friends--lời-mời--bạn-bè)
- [Blocks](#blocks--chặn)

---

## Search user để kết bạn

```http
GET /api/v1/users/search?q=huytq&limit=20&cursor=42
Authorization: Bearer ...
```

**Query params:**
| Tên | Bắt buộc | Default | Ghi chú |
|---|---|---|---|
| `q` | ✅ | — | Từ khoá, **tối thiểu 2 ký tự**. Match `prefix` của `username/email/phone`, `contains` của `displayName`. |
| `limit` | ❌ | 20 | 1–50. |
| `cursor` | ❌ | null | Của lần fetch trước (cursor pagination). |

**Rate limit:** 30 req/phút/IP (chống enumeration).

Response `200`:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "9d8b14cf-5392-452f-9ce3-557ded65d2d6",
        "username": "huytq",
        "email": "huytq203@gmail.com",
        "displayName": "Trần Quang Huy",
        "avatarUrl": null,
        "friendship": "NONE"
      }
    ],
    "nextCursor": "42"   // null nếu hết
  }
}
```

### `friendship` quyết định UI

| Giá trị | Ý nghĩa | UI gợi ý |
|---|---|---|
| `NONE` | Chưa có quan hệ | Nút "Kết bạn" |
| `PENDING_OUT` | Viewer đã gửi lời mời, chờ target | Nút "Huỷ lời mời" |
| `PENDING_IN` | Target đã mời viewer | Nút "Chấp nhận" / "Từ chối" |
| `ACCEPTED` | Đã là bạn | Badge "Bạn bè", nút "Nhắn tin" |
| `BLOCKED_BY_ME` | Viewer đang chặn target | Badge "Đã chặn", nút "Bỏ chặn" |

**Lưu ý:**
- User đang **chặn viewer** sẽ **KHÔNG xuất hiện** trong kết quả (privacy).
- Self không bao giờ xuất hiện.
- User `DELETED/BANNED` bị loại.

### Cursor pagination — sample

```ts
let cursor: string | null = null;

async function loadMore(q: string) {
  const url = new URL('/api/v1/users/search', BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '20');
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const { data } = await res.json();

  appendItems(data.items);
  cursor = data.nextCursor;
  return cursor !== null;     // còn nữa không
}

// Khi user gõ keyword mới → reset
function onQueryChange(newQ: string) {
  cursor = null;
  clearList();
  loadMore(newQ);
}
```

---

## Friends — Lời mời & Bạn bè

### Gửi lời mời

```http
POST /api/v1/friends/requests
Content-Type: application/json
Authorization: Bearer ...

{
  "targetUserId": "9d8b14cf-5392-452f-9ce3-557ded65d2d6",
  "nickname": "Lan béo",        // optional
  "source": "SEARCH"            // optional: PHONE|SEARCH|QR|GROUP|LINK|SUGGEST
}
```

Response `201`:
```json
{
  "success": true,
  "data": {
    "targetUserId": "9d8b14cf-...",
    "status": "PENDING_OUT"
  }
}
```

**Đặc biệt:** Nếu **target đã mời viewer trước đó**, gọi endpoint này sẽ **auto-accept** → trả `status: "ACCEPTED"`. FE chỉ cần đọc field `status` trong response để update UI tương ứng.

> 🔔 BE tự gửi notification `FRIEND_REQUEST_RECEIVED` realtime cho target qua WS + push FCM. Xem [07-notifications.md](./07-notifications.md).

Rate limit: 30 req/phút/IP.

Lỗi:
| Code | HTTP | Ý nghĩa |
|---|---|---|
| `FRIEND_SELF` | 400 | Tự kết bạn với mình |
| `USER_NOT_FOUND` | 404 | `targetUserId` không tồn tại |
| `FRIEND_BLOCKED` | 403 | 1 trong 2 phía đang chặn nhau |
| `FRIEND_ALREADY_FRIENDS` | 409 | Đã là bạn rồi |

### Lời mời đang đến

```http
GET /api/v1/friends/requests/incoming?limit=20&cursor=...
```

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "user": {
          "id": "...",
          "username": "huytq",
          "displayName": "Huy",
          "avatarUrl": null
        },
        "status": "PENDING_IN",
        "nickname": null,
        "createdAt": "2026-05-21T08:00:00.000Z",
        "acceptedAt": null
      }
    ],
    "nextCursor": null
  }
}
```

### Lời mời viewer đã gửi

```http
GET /api/v1/friends/requests/outgoing?limit=20&cursor=...
```

Shape giống `incoming`, status = `PENDING_OUT`.

### Chấp nhận lời mời

```http
POST /api/v1/friends/requests/{targetUserId}/accept
```

Response `200`:
```json
{ "success": true, "data": { "targetUserId": "...", "status": "ACCEPTED" } }
```

> 🔔 BE tự gửi noti `FRIEND_REQUEST_ACCEPTED` cho target (người gửi lời mời).

Lỗi: `FRIEND_REQUEST_NOT_FOUND` (404), `FRIEND_REQUEST_NOT_OWNER` (403 — viewer không phải người nhận).

### Từ chối lời mời

```http
POST /api/v1/friends/requests/{targetUserId}/reject
```

Xoá row PENDING. Target có thể gửi lại được. Response status = `NONE`.

### Huỷ lời mời đã gửi (sender thao tác)

```http
DELETE /api/v1/friends/requests/{targetUserId}
```

Chỉ người **đã gửi** mới được huỷ (`FRIEND_REQUEST_NOT_OWNER` nếu không phải sender). Response status = `NONE`.

### Danh sách bạn bè

```http
GET /api/v1/friends?limit=20&cursor=...
```

Response: chỉ trả các bản ghi có `status = ACCEPTED`. Item shape giống `incoming/outgoing`, có thêm `acceptedAt`.

### Huỷ kết bạn

```http
DELETE /api/v1/friends/{targetUserId}
```

Cả 2 phía đều có quyền gọi. Xoá quan hệ 2 chiều. Response status = `NONE`.

Lỗi: `FRIEND_NOT_FRIENDS` (404 — chưa từng là bạn).

---

## Blocks — Chặn

### Chặn user

```http
POST /api/v1/blocks
Content-Type: application/json

{
  "targetUserId": "9d8b14cf-...",
  "reason": "Spam"     // optional, max 255 ký tự
}
```

Response `201`: `{ targetUserId }`.

**Side-effect:** Tự động **xoá mọi quan hệ kết bạn / lời mời** giữa 2 user (cả 2 chiều).

Lỗi: `BLOCK_SELF` (400), `BLOCK_ALREADY_EXISTS` (409), `USER_NOT_FOUND` (404).

### Bỏ chặn

```http
DELETE /api/v1/blocks/{targetUserId}
```

Response `200`. Lỗi `BLOCK_NOT_FOUND` (404) nếu chưa chặn.

> ⚠️ Sau khi unblock, **không tự động khôi phục quan hệ bạn bè cũ** — phải kết bạn lại từ đầu.

### Danh sách user đã chặn

```http
GET /api/v1/blocks?limit=20&cursor=...
```

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "user": {
          "id": "...",
          "username": "spammer",
          "displayName": "Spam User",
          "avatarUrl": null
        },
        "reason": "Spam",
        "createdAt": "2026-05-21T08:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

---

## Realtime — event `friend:update`

Server emit `friend:update` vào **user room** mỗi khi 1 trong 2 phía thực hiện action (send/accept/reject/cancel/unfriend). FE dùng để cập nhật `incomingList`, `outgoingList`, `friendsList` mà không cần refetch.

### Payload

```ts
{
  type: 'REQUEST_SENT' | 'REQUEST_ACCEPTED' | 'REQUEST_REJECTED'
      | 'REQUEST_CANCELLED' | 'UNFRIENDED',
  otherUserId: string,        // user kia (không phải bản thân recipient)
  status: 'PENDING_IN' | 'PENDING_OUT' | 'ACCEPTED' | 'NONE',
  at: string,                 // ISO timestamp
}
```

### Mapping action → event nhận được

| Action | Viewer (người gọi API) | Target (user kia) |
|---|---|---|
| `POST /friends/requests` (send) | `REQUEST_SENT` + `PENDING_OUT` | `REQUEST_SENT` + `PENDING_IN` |
| `POST /friends/requests` (auto-accept khi target đã mời trước) | `REQUEST_ACCEPTED` + `ACCEPTED` | `REQUEST_ACCEPTED` + `ACCEPTED` |
| `POST /:id/accept` | `REQUEST_ACCEPTED` + `ACCEPTED` | `REQUEST_ACCEPTED` + `ACCEPTED` |
| `POST /:id/reject` | `REQUEST_REJECTED` + `NONE` | `REQUEST_REJECTED` + `NONE` |
| `DELETE /requests/:id` (cancel) | `REQUEST_CANCELLED` + `NONE` | `REQUEST_CANCELLED` + `NONE` |
| `DELETE /:id` (unfriend) | `UNFRIENDED` + `NONE` | `UNFRIENDED` + `NONE` |

> Field `otherUserId` LUÔN là user kia (từ góc nhìn recipient). FE dùng để tìm đúng row trong list để remove/update.

### Handler mẫu

```ts
socket.on('friend:update', ({ type, otherUserId, status }) => {
  switch (type) {
    case 'REQUEST_SENT':
      if (status === 'PENDING_IN') incomingStore.add({ userId: otherUserId });
      else outgoingStore.add({ userId: otherUserId });
      break;

    case 'REQUEST_ACCEPTED':
      incomingStore.remove(otherUserId);
      outgoingStore.remove(otherUserId);
      friendsStore.add({ userId: otherUserId });
      break;

    case 'REQUEST_REJECTED':
    case 'REQUEST_CANCELLED':
      incomingStore.remove(otherUserId);
      outgoingStore.remove(otherUserId);
      break;

    case 'UNFRIENDED':
      friendsStore.remove(otherUserId);
      break;
  }
});
```

### Side-effect noti tự clear

Khi user xử lý lời mời (accept/reject), server **tự mark read** notification `FRIEND_REQUEST_RECEIVED` tương ứng và emit `notification:cleared` để FE giảm badge ngay. Tương tự khi sender cancel → noti ở target cũng được clear. Chi tiết: [07-notifications.md](./07-notifications.md#auto-clear-notification).

---

**Liên quan:**
- 🔔 Noti friend request realtime → [07-notifications.md](./07-notifications.md)
- 💬 Mở chat 1-1 sau khi accept → [03-conversations.md](./03-conversations.md#tạo-chat-1-1-direct)
- 📖 Flow đầy đủ "search → kết bạn → chat" → [13-cookbook.md](./13-cookbook.md#flow-kết-bạn--từ-search-đến-chat)
