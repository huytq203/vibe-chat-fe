# 01 — Authentication

> Quản lý JWT access token + refresh cookie. Áp dụng cho **mọi request** cần auth.

Backend đã wrap Keycloak. **FE KHÔNG gọi Keycloak trực tiếp** — chỉ gọi `/api/v1/auth/*` của backend.

- **Access token**: trả về trong response body, FE giữ trong **memory** (không localStorage).
- **Refresh token**: backend set **HttpOnly cookie** `refresh_token` (`path=/api`, `SameSite=Strict`, `Secure` ở prod). Browser tự gửi kèm request → FE **không cần đụng tay**.
- ⚠️ Quan trọng: mọi request auth-related **phải có `credentials: 'include'`** (fetch) hoặc `withCredentials: true` (axios) để cookie được gửi đi.

---

## 1.1. Đăng ký

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

## 1.2. Đăng nhập

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

## 1.3. Refresh access token

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

## 1.4. Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

Response `204 No Content`. Backend:
- Clear cookie `refresh_token`
- Revoke session ở Keycloak

FE sau đó clear access token trong memory + redirect login.

> 💡 Nếu app dùng FCM, **xoá FCM token TRƯỚC khi logout** — xem [07-notifications.md](./07-notifications.md#xoá-fcm-token).

## 1.5. Hồ sơ user hiện tại

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

## 1.6. Gửi JWT cho REST endpoint khác

Mọi request có data (trừ `/health`, `/auth/login`, `/auth/register`, `/auth/refresh`) phải có header:

```
Authorization: Bearer {accessToken}
```

## 1.7. Gửi JWT cho WebSocket

Truyền trong `auth` của socket.io handshake — xem [08-websocket.md](./08-websocket.md#connect).

## 1.8. Sample auth client (fetch)

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

## 1.9. CORS — lưu ý quan trọng

Backend cần config `CORS_ORIGINS` chứa origin của FE và `credentials: true`. FE phải:
- **Origin phải khớp chính xác** với `CORS_ORIGINS` (kể cả port). `localhost:5173` ≠ `127.0.0.1:5173`.
- **KHÔNG được dùng `Access-Control-Allow-Origin: *`** khi `credentials: 'include'` — browser sẽ từ chối.

Nếu cookie không được set sau login:
1. Check Network → response có header `Set-Cookie: refresh_token=...` chưa?
2. Check cookie domain/path có khớp request URL không (`path=/api` nghĩa là chỉ gửi với request bắt đầu `/api`).
3. Check `SameSite` — nếu FE và BE khác origin → cookie phải `SameSite=None; Secure` (chỉ HTTPS). Dev local thường share `localhost` nên ổn.

---

**Tiếp theo:** [02-response-envelope.md](./02-response-envelope.md) để hiểu format response.
