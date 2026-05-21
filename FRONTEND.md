# Vibe Chat — Frontend Integration Guide

> Tài liệu cho FE team integrate với Vibe Chat backend (NestJS + REST + Socket.io).
> Backend: `http://localhost:3000` (dev). WebSocket namespace: `/chat`.
> Swagger doc đầy đủ: `http://localhost:3000/api/docs`.

---

## Mục lục

1. [Authentication](#1-authentication)
2. [Response envelope](#2-response-envelope)
3. [REST API](#3-rest-api)
   - 3.1 Conversations
   - 3.2 Messages
   - 3.3 Presence
   - 3.4 Users — Search (kết bạn)
   - 3.5 Friends — Kết bạn
   - 3.6 Blocks — Chặn
4. [WebSocket realtime](#4-websocket-realtime)
5. [Mã hoá tin nhắn — SERVER vs E2E](#5-mã-hoá-tin-nhắn--server-vs-e2e)
6. [Idempotency — `clientNonce`](#6-idempotency--clientnonce)
7. [Online status](#7-online-status)
8. [Error codes](#8-error-codes)
9. [Cookbook — flow hoàn chỉnh](#9-cookbook)

---

## 1. Authentication

Backend đã wrap Keycloak. **FE KHÔNG gọi Keycloak trực tiếp** — chỉ gọi `/api/v1/auth/*` của backend.

- **Access token**: trả về trong response body, FE giữ trong memory (đừng localStorage).
- **Refresh token**: backend set **HttpOnly cookie** `refresh_token` (`path=/api`, `SameSite=Strict`, `Secure` ở prod). Browser tự gửi kèm request → FE **không cần đụng tay**.
- Quan trọng: mọi request auth-related **phải có `credentials: 'include'`** (fetch) hoặc `withCredentials: true` (axios) để cookie được gửi đi.

### 1.1. Đăng ký

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "Password123",
  "displayName": "John Doe",     // optional
  "phone": "0901234567"          // optional
}
```

**Validation:**
- `username`: 3–50 ký tự, chỉ `a–z 0–9 _ . -`, lowercase.
- `password`: ≥ 6 ký tự, có ít nhất 1 chữ hoa + 1 số.
- `email`: định dạng email hợp lệ.
- `phone`: 11–20 ký tự.

Response `201 Created`:
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "",                // luôn rỗng — đã set cookie
      "expiresIn": 900,                  // giây (15 phút)
      "tokenType": "Bearer"
    },
    "user": {
      "id": "9d8b14cf-5392-452f-9ce3-557ded65d2d6",   // = keycloakId
      "username": "john_doe",
      "email": "john@example.com",
      "phone": null,
      "displayName": "John Doe",
      "avatarUrl": null,
      "status": "ACTIVE",
      "isOnline": false,
      "lastSeenAt": null,
      "createdAt": "..."
    }
  }
}
```

Lỗi thường gặp:
- `409 Conflict` — username/email đã tồn tại.
- `400 VALIDATION_ERROR` — sai format, response có `details: { field: 'thông báo' }`.

### 1.2. Đăng nhập

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "john_doe",          // hoặc email
  "password": "Password123"
}
```

Rate-limit: **5 request / phút / IP**.

Response giống `register` — `data.tokens.accessToken` + `data.user`. Refresh cookie tự set.

Lỗi: `401` "Sai tên đăng nhập hoặc mật khẩu" — **không phân biệt** username sai vs password sai (chống enumeration).

### 1.3. Refresh access token

Access token sống 15 phút. Khi sắp/đã hết hạn → gọi refresh:

```http
POST /api/v1/auth/refresh
# KHÔNG cần body, KHÔNG cần Authorization header
# Browser tự gửi cookie refresh_token kèm
```

Response `200`:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",         // token mới
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

Cookie `refresh_token` cũng được **rotate** (giá trị mới). Nếu refresh fail `401` → redirect login.

### 1.4. Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

Response `204 No Content`. Backend:
- Clear cookie `refresh_token`
- Revoke session ở Keycloak

FE sau đó clear access token trong memory + redirect login.

### 1.5. Hồ sơ user hiện tại

```http
GET /api/v1/auth/me
Authorization: Bearer {accessToken}
```

```json
{
  "success": true,
  "data": {
    "id": "9d8b14cf-5392-452f-9ce3-557ded65d2d6",   // = keycloakId
    "username": "john_doe",
    "email": "john@example.com",
    "phone": null,
    "displayName": "John Doe",
    "avatarUrl": null,
    "status": "ACTIVE",
    "isOnline": false,
    "lastSeenAt": null,
    "createdAt": "..."
  }
}
```

> **`id` ở response = `keycloakId`**. FE dùng `id` này cho `senderId`, `memberIds`, `userId`, lookup presence... ở mọi nơi khác.

### 1.6. Gửi JWT cho REST endpoint khác

Mọi request có data (trừ `/health`, `/auth/login`, `/auth/register`, `/auth/refresh`) phải có header:

```
Authorization: Bearer {accessToken}
```

### 1.7. Gửi JWT cho WebSocket

Truyền trong `auth` của socket.io handshake (xem mục [WebSocket](#4-websocket-realtime)).

### 1.8. Sample auth client (fetch)

```ts
// Quan trọng: credentials: 'include' để browser gửi cookie
const API = 'http://localhost:3000';

let accessToken: string | null = null;

async function login(username: string, password: string) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',                   // ← phải có để nhận cookie
    body: JSON.stringify({ username, password }),
  });
  const { data } = await res.json();
  accessToken = data.tokens.accessToken;
  return data.user;
}

async function refresh() {
  const res = await fetch(`${API}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',                   // ← cookie auto gửi
  });
  if (!res.ok) throw new Error('Refresh failed');
  const { data } = await res.json();
  accessToken = data.accessToken;
}

async function logout() {
  await fetch(`${API}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  accessToken = null;
}

// Wrapper auto-refresh khi gặp 401
async function apiCall(path: string, init: RequestInit = {}) {
  const doFetch = () => fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...init.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  let res = await doFetch();
  if (res.status === 401 && accessToken) {
    try {
      await refresh();
      res = await doFetch();          // retry 1 lần với token mới
    } catch {
      // refresh fail → redirect login
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }
  return res;
}
```

### 1.9. CORS — lưu ý quan trọng

Backend cần config `CORS_ORIGINS` chứa origin của FE và `credentials: true`. FE phải:
- **Origin phải khớp chính xác** với `CORS_ORIGINS` (kể cả port). `localhost:5173` ≠ `127.0.0.1:5173`.
- **KHÔNG được dùng `Access-Control-Allow-Origin: *`** khi `credentials: 'include'` — browser sẽ từ chối.

Nếu cookie không được set sau login:
1. Check Network → response có header `Set-Cookie: refresh_token=...` chưa?
2. Check cookie domain/path có khớp request URL không (`path=/api` nghĩa là chỉ gửi với request bắt đầu `/api`).
3. Check `SameSite` — nếu FE và BE khác origin → cookie phải `SameSite=None; Secure` (chỉ HTTPS). Dev local thường share `localhost` nên ổn.

---

## 2. Response envelope

### Success
```json
{
  "success": true,
  "data": { ... },                  // payload chính
  "meta": { "page": 1, "limit": 20, "total": 100 },   // chỉ khi list/paginate
  "timestamp": "2026-05-15T10:00:00.000Z"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",       // FE bắt theo code này
    "message": "Không tìm thấy người dùng",   // tiếng Việt, có thể hiện toast
    "details": null                  // optional, ví dụ list field validation lỗi
  },
  "timestamp": "2026-05-15T10:00:00.000Z",
  "path": "/api/v1/...",
  "requestId": null
}
```

Bảng đầy đủ `code` xem mục [Error codes](#8-error-codes).

---

## 3. REST API

> Prefix: `/api/v1`
> Tất cả ID public là **UUID v4**. FE không bao giờ thấy ObjectId/BIGINT nội bộ.

### 3.1. Conversations

#### Tạo chat 1-1 (DIRECT)

```http
POST /api/v1/conversations/direct
Authorization: Bearer ...
Content-Type: application/json

{
  "userId": "9d8b14cf-5392-452f-9ce3-557ded65d2d6",
  "encryptionType": "SERVER"   // optional, default "SERVER"
}
```

- `userId`: keycloakId của người kia
- `encryptionType`: `"SERVER"` (default, có preview/search) hoặc `"E2E"` (Secret Chat, FE encrypt)
- **Idempotent**: gọi lại với cùng `userId` → trả conversation cũ

Response: object `Conversation` (mục 3.1.3).

#### Tạo group

```http
POST /api/v1/conversations/group

{
  "name": "Team Vibe",
  "description": "Nhóm dev",     // optional
  "memberIds": [
    "9d8b14cf-5392-452f-9ce3-557ded65d2d6",
    "550e8400-e29b-41d4-a716-446655440000"
  ],
  "encryptionType": "SERVER"     // optional
}
```

- `memberIds`: **KHÔNG cần** truyền keycloakId của chính bạn (server tự thêm với role `OWNER`)
- Cần ≥ 1 member khác

#### Danh sách conversation của user

```http
GET /api/v1/conversations?page=1&limit=20
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "e7b5991b-1ddc-468e-952b-824024d700c6",
      "type": "DIRECT",
      "name": null,
      "ownerId": "...",
      "encryptionType": "SERVER",
      "memberCount": 2,
      "messageCount": 8,
      "memberIds": [...],
      "lastMessage": {
        "id": "...",
        "senderId": "...",
        "type": "TEXT",
        "preview": "Hi nha",       // NULL nếu E2E
        "createdAt": "..."
      },
      "lastMessageAt": "2026-05-15T07:30:00Z",
      "unreadCount": 3,
      "createdAt": "..."
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

#### Chi tiết 1 conversation

```http
GET /api/v1/conversations/{id}
```

`{id}` = UUID của conversation.

#### Conversation object — full shape

| Field | Type | Mô tả |
|---|---|---|
| `id` | UUID | public ID, dùng cho URL/lookup |
| `type` | `'DIRECT'\|'GROUP'\|'CHANNEL'` | loại |
| `name` | `string\|null` | tên (null cho DIRECT) |
| `description` | `string\|null` | |
| `avatarUrl` | `string\|null` | |
| `ownerId` | UUID keycloakId | người tạo |
| `encryptionType` | `'SERVER'\|'E2E'` | quyết định FE gửi tin thế nào |
| `memberCount` | number | |
| `messageCount` | number | |
| `memberIds` | UUID[] | keycloakId thành viên ACTIVE |
| `lastMessage` | object\|null | embed message cuối — `preview` null nếu E2E |
| `lastMessageAt` | ISO date\|null | |
| `unreadCount` | number | unread của user hiện tại |
| `createdAt` | ISO date | |

### 3.2. Messages

URL pattern: `/api/v1/conversations/{conversationId}/...`

#### Gửi tin nhắn — conversation SERVER

```http
POST /api/v1/conversations/{conversationId}/messages

{
  "plaintext": "Xin chào",
  "clientNonce": "uuid-FE-tự-sinh-cho-retry",   // optional
  "type": "TEXT",                                // optional, default TEXT
  "metadata": { "width": 1920 },                 // optional
  "replyToMessageId": "uuid-message-đang-reply"  // optional
}
```

- Chỉ dùng được nếu `conversation.encryptionType === "SERVER"` (gọi vào conv E2E → `400`)
- Server tự encrypt AES-256-GCM rồi lưu
- Server tự gen `id` (UUID v4)
- `plaintext` tối đa 5000 ký tự

#### Gửi tin nhắn — conversation E2E (Secret Chat)

```http
POST /api/v1/conversations/{conversationId}/secret-messages

{
  "encrypted": {
    "ciphertext": "<base64>",        // FE tự encrypt với AES-256-GCM
    "iv": "<base64 16 ký tự>",        // 12 byte IV
    "authTag": "<base64 24 ký tự>",   // 16 byte authTag
    "keyId": "client-managed-key-id",
    "keyVersion": 1
  },
  "clientNonce": "...",                // optional
  "type": "TEXT"
}
```

- FE **chịu trách nhiệm encrypt** trước khi gửi. Server pass-through.
- Cách FE manage key — xem mục [E2E](#5-mã-hoá-tin-nhắn--server-vs-e2e)

#### Lấy lịch sử tin nhắn

```http
GET /api/v1/conversations/{conversationId}/messages?limit=20&before=2026-05-15T10:00:00Z
```

- Sort theo `createdAt` desc (mới nhất trước)
- Cursor pagination qua `before` (ISO date) — lấy tin có `createdAt < before`
- `limit` mặc định 20, tối đa 100
- Response trả về cả SERVER và E2E messages — phân biệt qua `encryptionType` field

Response:
```json
{
  "success": true,
  "data": [
    { ... message },
    ...
  ],
  "meta": {
    "limit": 20,
    "nextCursor": "2026-05-15T09:55:00Z"   // dùng làm `before` cho lần fetch tiếp
  }
}
```

`nextCursor` = `null` → đã hết tin.

#### Message object — full shape

```ts
{
  id: string;                  // UUID public của message
  conversationId: string;      // UUID của conversation
  senderId: string;            // keycloakId người gửi
  type: 'TEXT'|'IMAGE'|'VIDEO'|'AUDIO'|'FILE'|'STICKER'|'LOCATION'|'CONTACT'|'SYSTEM'|'CALL';

  encryptionType: 'SERVER'|'E2E';  // copy từ conv — discriminator

  // 1 trong 2 field dưới có giá trị:
  plaintext: string | null;        // CÓ với SERVER, NULL với E2E
  encrypted: {                     // CÓ với E2E, NULL với SERVER
    ciphertext: string;            // base64
    iv: string;                    // base64
    authTag: string;               // base64
    keyId: string;
    keyVersion: number;
  } | null;

  contentPreview: string | null;   // preview ngắn (≤150 char), NULL với E2E
  metadata: Record<string, unknown> | null;
  replyToMessageId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;               // ISO date
}
```

#### Đánh dấu đã đọc

```http
POST /api/v1/conversations/{conversationId}/messages/{messageId}/read
```

Response: `204 No Content`.

Sau khi gọi → `conversation.unreadCount` của user reset về 0, server broadcast event `message:read` tới các socket khác.

### 3.3. Presence

#### 1 user

```http
GET /api/v1/presence/{userId}
```

```json
{
  "data": {
    "userId": "...",
    "isOnline": false,
    "lastSeenAt": "2026-05-15T10:30:00Z",
    "lastSeenLabel": "5 phút trước"     // null nếu > 3 giờ
  }
}
```

#### Nhiều user (bulk)

```http
GET /api/v1/presence?userIds=user1,user2,user3
```

Response: `data: PresenceResponse[]`.

> Xem mục [Online status](#7-online-status) để hiểu cách hiển thị `lastSeenLabel`.

### 3.4. Users — Search (kết bạn)

#### Tìm user qua username / email / phone / displayName

```http
GET /api/v1/users/search?q=huytq&limit=20&cursor=42
Authorization: Bearer ...
```

**Query params:**
| Tên | Bắt buộc | Default | Ghi chú |
|---|---|---|---|
| `q` | ✅ | — | Từ khoá, **tối thiểu 2 ký tự**. Match `prefix` của `username/email/phone`, `contains` của `displayName`. |
| `limit` | ❌ | 20 | 1–50. |
| `cursor` | ❌ | null | Của lần fetch trước (xem mục [Cursor pagination](#cursor-pagination)). |

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

`friendship` quyết định UI:
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

#### Cursor pagination

FE giữ biến `cursor`, lần đầu = `null`. Mỗi response trả `nextCursor`:
- `nextCursor !== null` → còn data, save lại để gọi tiếp.
- `nextCursor === null` → hết.

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

### 3.5. Friends — Kết bạn

Tất cả endpoint require JWT. ID trong path/body là **Keycloak UUID** (chính là `user.id`).

#### Gửi lời mời

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

Rate limit: 30 req/phút/IP.

Lỗi:
| Code | HTTP | Ý nghĩa |
|---|---|---|
| `FRIEND_SELF` | 400 | Tự kết bạn với mình |
| `USER_NOT_FOUND` | 404 | `targetUserId` không tồn tại |
| `FRIEND_BLOCKED` | 403 | 1 trong 2 phía đang chặn nhau |
| `FRIEND_ALREADY_FRIENDS` | 409 | Đã là bạn rồi |

#### Lời mời đang đến (chờ viewer phản hồi)

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

#### Lời mời viewer đã gửi (chờ phản hồi)

```http
GET /api/v1/friends/requests/outgoing?limit=20&cursor=...
```

Response shape giống `incoming`, status = `PENDING_OUT`.

#### Chấp nhận lời mời

```http
POST /api/v1/friends/requests/{targetUserId}/accept
```

Response `200`:
```json
{ "success": true, "data": { "targetUserId": "...", "status": "ACCEPTED" } }
```

Lỗi: `FRIEND_REQUEST_NOT_FOUND` (404), `FRIEND_REQUEST_NOT_OWNER` (403 — viewer không phải người nhận).

#### Từ chối lời mời

```http
POST /api/v1/friends/requests/{targetUserId}/reject
```

Xoá row PENDING, sau đó target có thể gửi lại được. Response status = `NONE`.

#### Huỷ lời mời đã gửi (sender thao tác)

```http
DELETE /api/v1/friends/requests/{targetUserId}
```

Chỉ người **đã gửi** mới được huỷ (`FRIEND_REQUEST_NOT_OWNER` nếu không phải sender). Response status = `NONE`.

#### Danh sách bạn bè

```http
GET /api/v1/friends?limit=20&cursor=...
```

Response: chỉ trả các bản ghi có `status = ACCEPTED`. Item shape giống `incoming/outgoing`, có thêm `acceptedAt`.

#### Huỷ kết bạn

```http
DELETE /api/v1/friends/{targetUserId}
```

Cả 2 phía đều có quyền gọi. Xoá quan hệ 2 chiều. Response status = `NONE`.

Lỗi: `FRIEND_NOT_FRIENDS` (404 — chưa từng là bạn).

### 3.6. Blocks — Chặn người dùng

#### Chặn user

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

#### Bỏ chặn

```http
DELETE /api/v1/blocks/{targetUserId}
```

Response `200`. Lỗi `BLOCK_NOT_FOUND` (404) nếu chưa chặn.

> Sau khi unblock, **không tự động khôi phục quan hệ bạn bè cũ** — phải kết bạn lại từ đầu.

#### Danh sách user đã chặn

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

## 4. WebSocket realtime

### Connect

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: { token: accessToken },        // JWT từ Keycloak
  transports: ['websocket'],
  reconnection: true,
});

socket.on('connect', () => console.log('WS connected', socket.id));
socket.on('disconnect', (reason) => console.log('WS disconnect:', reason));
socket.on('error', (err) => console.error('WS error:', err));
```

> **Lưu ý**: namespace là `/chat` — KHÔNG phải root.

### Join / leave conversation

Trước khi gửi/nhận tin nhắn realtime của 1 conversation, **phải join room** của nó:

```ts
socket.emit('conversation:join', { conversationId: 'uuid-...' });
// có thể chờ ack: socket.emitWithAck('conversation:join', {...})

socket.emit('conversation:leave', { conversationId: 'uuid-...' });
```

> Không join vẫn nhận được notif qua event `conversation:notify` (broadcast tới room user cá nhân) — đủ để FE biết "có tin mới ở conv X" và refresh sidebar. Nhưng để nhận message stream realtime trong chat đang mở thì cần join.

### Gửi tin nhắn

**SERVER conv:**
```ts
const ack = await socket.emitWithAck('message:send', {
  conversationId: 'uuid-...',
  plaintext: 'Xin chào',
  clientNonce: crypto.randomUUID(),     // optional
  type: 'TEXT',
});
// ack: { ok: true, messageId: 'uuid-server-gen' }
```

**E2E conv:**
```ts
const ack = await socket.emitWithAck('message:send:secret', {
  conversationId: 'uuid-...',
  encrypted: { ciphertext, iv, authTag, keyId, keyVersion },
  clientNonce: crypto.randomUUID(),
});
```

### Nhận tin nhắn mới

```ts
// Nếu đã join room conversation
socket.on('message:new', (message) => {
  // message là MessageResponseDto đầy đủ
  // Append vào UI
});

// Conv chưa join (để biết có tin mới ở conv khác → reload sidebar)
socket.on('conversation:notify', ({ conversationId, message }) => {
  // Tăng unread badge / show notification
});
```

### Typing indicator

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

### Read receipt

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

### Presence

```ts
// Gửi heartbeat 30s/lần để báo "vẫn online" (server đã tự set online lúc connect,
// heartbeat giữ lastSeenAt cập nhật khi socket idle dài)
setInterval(() => socket.emit('presence:heartbeat'), 30_000);

// Lắng nghe presence của user khác đổi trạng thái
socket.on('presence:update', ({ userId, isOnline, lastSeenAt, lastSeenLabel }) => {
  // Cập nhật chấm xanh online / text "X phút trước" trên UI
});
```

### Bảng tổng hợp WS events

| Hướng | Event | Payload | Mô tả |
|---|---|---|---|
| C→S | `conversation:join` | `{ conversationId }` | Join room realtime |
| C→S | `conversation:leave` | `{ conversationId }` | Leave room |
| C→S | `message:send` | `WsSendServerMessage` | Gửi tin SERVER conv |
| C→S | `message:send:secret` | `WsSendSecretMessage` | Gửi tin E2E conv |
| C→S | `message:read` | `{ conversationId, messageId }` | Đánh dấu đọc |
| C→S | `typing` | `{ conversationId, state }` | Báo đang/dừng gõ |
| C→S | `presence:heartbeat` | — | Giữ session online |
| S→C | `message:new` | `MessageResponse` | Có tin mới trong conv đang join |
| S→C | `conversation:notify` | `{ conversationId, message }` | Tin mới ở conv khác (không join room) |
| S→C | `message:read` | `{ conversationId, messageId, userId, readAt }` | User khác đã đọc |
| S→C | `typing` | `{ conversationId, userId, state }` | User khác đang gõ |
| S→C | `presence:update` | `{ userId, isOnline, lastSeenAt, lastSeenLabel }` | Trạng thái online đổi |
| S→C | `error` | `{ code, message }` | Lỗi (vd auth fail) — socket sẽ disconnect |

---

## 5. Mã hoá tin nhắn — SERVER vs E2E

Mỗi conversation có field `encryptionType`. FE đọc field này để biết gửi bằng cách nào.

| Mode | FE làm gì | BE làm gì | Trade-off |
|---|---|---|---|
| `SERVER` (default) | Gửi `plaintext` thô qua HTTPS | Encrypt AES-256-GCM rồi lưu DB | ✅ Preview push notif, ✅ Search, ✅ Multi-device sync; ⚠️ Server đọc được tin |
| `E2E` (Secret Chat) | Tự encrypt với key thoả thuận → gửi `encrypted` blob | Pass-through, KHÔNG decrypt | ✅ Server hack vẫn không lộ tin; ❌ Không preview push, ❌ Không search, ❌ Multi-device cần sync key thủ công |

### Khi nào FE chọn E2E?

- Conversation nhạy cảm — user chủ động bật "Secret Chat" từ UI
- Cần compliance privacy cao
- Mặc định **không bật E2E** cho user thường — UX kém vì mất preview/search

### FE encrypt cho E2E thế nào?

Pattern tối thiểu (browser Web Crypto API):

```ts
// 1. Sinh DEK 1 lần khi tạo Secret Chat — thoả thuận với người kia
//    (qua kênh khác: QR code, ECDH, Signal Protocol... — ngoài scope này)
const dek = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

// 2. Encrypt mỗi tin nhắn
async function encryptMessage(plaintext: string, dek: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));   // 12 byte
  const enc = new TextEncoder().encode(plaintext);
  const ciphertextWithTag = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, enc)
  );
  // Web Crypto trả ciphertext + authTag dính liền — tách 16 byte cuối
  const authTag = ciphertextWithTag.slice(-16);
  const ciphertext = ciphertextWithTag.slice(0, -16);
  return {
    ciphertext: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    authTag: btoa(String.fromCharCode(...authTag)),
    keyId: 'conv-uuid-v1',     // FE tự định danh
    keyVersion: 1,
  };
}

// 3. Decrypt khi nhận
async function decryptMessage(blob, dek) {
  const ciphertext = Uint8Array.from(atob(blob.ciphertext), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(blob.iv), c => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(blob.authTag), c => c.charCodeAt(0));
  const combined = new Uint8Array([...ciphertext, ...authTag]);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, combined);
  return new TextDecoder().decode(plain);
}
```

**Quan trọng:**
- DEK **KHÔNG BAO GIỜ** gửi lên server (không dạng plaintext)
- DEK lưu IndexedDB / Keychain — không lưu localStorage
- Multi-device: phải có cơ chế share DEK an toàn (ECDH giữa 2 device, hoặc nhập manual). Phiên bản hiện tại chưa hỗ trợ — FE tự handle.

### Render UI

FE đọc `message.encryptionType`:

```ts
function renderMessage(m: MessageResponse) {
  if (m.encryptionType === 'SERVER') {
    return m.plaintext;
  }
  // E2E
  if (!hasKeyFor(m.conversationId)) {
    return '🔒 [Tin nhắn được mã hoá — không có khoá]';
  }
  return decryptMessage(m.encrypted, getKey(m.conversationId));
}
```

---

## 6. Idempotency — `clientNonce`

Khi mạng chập chờn, FE có thể không biết tin đã gửi thành công chưa và retry → server tạo trùng.

**Giải pháp**: FE sinh `clientNonce` (UUID hoặc bất kỳ chuỗi unique ≤100 char) **1 lần** cho mỗi tin nhắn logic, **giữ nguyên** qua các lần retry.

```ts
async function sendMessage(text: string, conversationId: string) {
  const nonce = crypto.randomUUID();    // ← sinh 1 lần, lưu queue local

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plaintext: text,
          clientNonce: nonce,        // SAME nonce mỗi lần retry
        }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw new Error('Send failed after retries');
}
```

Server thấy `(senderId, clientNonce)` đã tồn tại → trả lại message cũ thay vì tạo mới.

> Trên WS cũng truyền `clientNonce` y hệt. Mỗi message một nonce mới — tin tiếp theo phải sinh nonce khác.

---

## 7. Online status

Server đã tự **format label tiếng Việt** — FE chỉ việc hiển thị `lastSeenLabel`.

| Trạng thái | `lastSeenLabel` | FE hiển thị |
|---|---|---|
| Đang online | `"Đang hoạt động"` | Chấm xanh + text |
| Offline < 1 phút | `"Vừa truy cập"` | Text |
| Offline 1–59 phút | `"5 phút trước"` | Text |
| Offline 1–2 giờ | `"2 giờ trước"` | Text |
| Offline ≥ 3 giờ | `null` | **KHÔNG hiển thị gì** |

FE tuyệt đối **không tự format** từ `lastSeenAt` raw. Lấy `lastSeenLabel`, nếu `null` thì ẩn.

### Cập nhật realtime

Lắng nghe event `presence:update` để cập nhật label live mà không cần refresh:

```ts
socket.on('presence:update', ({ userId, isOnline, lastSeenLabel }) => {
  store.updateUserPresence(userId, { isOnline, lastSeenLabel });
});
```

Định kỳ (vd 1 phút/lần) call lại `GET /presence?userIds=...` để refresh label cho các user không có WS event gần đây.

---

## 8. Error codes

| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Body/query sai format | Show field error |
| `AUTH_UNAUTHORIZED` | 401 | Không có/sai token | Gọi `/auth/refresh`, fail thì redirect login |
| `AUTH_TOKEN_INVALID` | 401 | Token format sai | Refresh token |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token hết hạn | Refresh token |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | Refresh cookie sai/hết hạn | Redirect login |
| `AUTH_FORBIDDEN` | 403 | Token OK nhưng không đủ quyền | Show "Không có quyền" |
| `USER_NOT_FOUND` | 404 | userId không tồn tại trong MySQL | Show "User không tồn tại" |
| `CONVERSATION_NOT_FOUND` | 404 | conversationId sai | Refresh danh sách conv |
| `CONVERSATION_MEMBER_REQUIRED` | 403 | User không phải thành viên | Show "Bạn không có trong conv này" |
| `CONVERSATION_DIRECT_SELF` | 400 | Tự tạo DIRECT với mình | UX: ẩn nút khi click vào avatar mình |
| `MESSAGE_NOT_FOUND` | 404 | messageId sai (vd reply tin đã xoá) | — |
| `MESSAGE_NOT_OWNED` | 403 | Sửa/xoá tin của người khác | — |
| `MESSAGE_TOO_LONG` | 400 | Plaintext > 5000 ký tự | Show counter |
| `ENCRYPTION_KEY_NOT_FOUND` | 500 | Server-side bug — báo BE | — |
| `ENCRYPTION_FAILED` | 500 | Server không decrypt được | Hiện "Lỗi giải mã" + báo BE |
| `FRIEND_SELF` | 400 | Tự kết bạn với mình | UX: ẩn nút "Kết bạn" trên profile của chính mình |
| `FRIEND_BLOCKED` | 403 | 1 trong 2 phía đang chặn nhau | Show "Không thể thực hiện thao tác này" (không lộ ai chặn ai) |
| `FRIEND_REQUEST_NOT_FOUND` | 404 | Lời mời không tồn tại | Refresh list, có thể đã bị huỷ |
| `FRIEND_REQUEST_NOT_OWNER` | 403 | Không phải người được phép thao tác | — (logic FE sai, không nên xảy ra) |
| `FRIEND_REQUEST_ALREADY_EXISTS` | 409 | Đã có lời mời chờ | Refresh trạng thái friendship |
| `FRIEND_ALREADY_FRIENDS` | 409 | Đã là bạn | Refresh trạng thái friendship |
| `FRIEND_NOT_FRIENDS` | 404 | Chưa phải bạn (gọi unfriend khi không phải bạn) | — |
| `BLOCK_SELF` | 400 | Tự chặn mình | UX: ẩn nút "Chặn" trên profile của chính mình |
| `BLOCK_ALREADY_EXISTS` | 409 | Đã chặn rồi | Refresh trạng thái |
| `BLOCK_NOT_FOUND` | 404 | Chưa chặn (gọi unblock khi không có block) | Refresh list block |
| `INTERNAL_ERROR` | 500 | Lỗi không lường trước | Show "Có lỗi xảy ra" + retry |

---

## 9. Cookbook

### 9.1. Flow đăng nhập + tải danh sách chat

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
const me = data.user;                          // đã có sẵn user info, KHÔNG cần gọi /auth/me thêm

// 2. Connect WebSocket
const socket = io('/chat', { auth: { token: accessToken } });

// 3. Load danh sách conversation
const convs = await fetch('/api/v1/conversations?limit=20', {
  headers: { Authorization: `Bearer ${accessToken}` },
  credentials: 'include',
}).then(r => r.json());

// 4. Render sidebar
```

**Auto-refresh khi access token hết hạn** (15 phút):

```ts
// Setup timer refresh trước khi token hết hạn
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

### 9.2. Mở chat + gửi tin nhắn

```ts
// 1. Click vào 1 conversation
const conv = convs.data[0];

// 2. Join WS room
socket.emit('conversation:join', { conversationId: conv.id });

// 3. Load history
const history = await fetch(
  `/api/v1/conversations/${conv.id}/messages?limit=20`,
  { headers: { Authorization: `Bearer ${access_token}` } }
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

### 9.3. Optimistic UI

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

### 9.4. Pagination message (kéo lên load thêm)

```ts
async function loadOlder(conv: Conversation, oldestCursor: string | null) {
  if (!oldestCursor) return;     // hết tin
  const res = await fetch(
    `/api/v1/conversations/${conv.id}/messages?limit=20&before=${oldestCursor}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { data, meta } = (await res.json());
  prependMessages(data);          // chèn lên đầu list (vì sort desc)
  return meta.nextCursor;          // dùng cho lần next
}
```

### 9.5. Hiển thị badge unread

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

### 9.6. Flow kết bạn — từ search đến chat

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

### 9.7. Notification lời mời đến

```ts
// Polling đơn giản (10–30s/lần) hoặc gọi khi user mở app
async function checkIncoming() {
  const res = await fetch('/api/v1/friends/requests/incoming?limit=20', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { data } = await res.json();
  setIncomingBadge(data.items.length);   // badge ở icon 👥
  renderIncomingList(data.items);
}
```

> Realtime push cho friend-request chưa có ở v1 — sẽ thêm sau qua WS event `friend:request:incoming`. Tạm thời FE polling.

---

## Phụ lục

### Môi trường

```bash
BACKEND_URL=http://localhost:3000
WS_URL=ws://localhost:3000/chat
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=vibe
KEYCLOAK_CLIENT_ID=vibe-frontend
```

### Swagger interactive

`http://localhost:3000/api/docs` — bấm **Authorize** → dán `accessToken` → test mọi endpoint trực tiếp.

### Liên hệ BE

- Bug / feature request → tag BE team trong issue.
- Lỗi `ENCRYPTION_FAILED` / `INTERNAL_ERROR` → gửi `requestId` + thời gian cho BE để trace log.
