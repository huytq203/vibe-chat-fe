# 31 — Đăng nhập đa thiết bị (multi-device session)

> 1 tài khoản đăng nhập đồng thời trên **nhiều loại thiết bị**, mỗi loại tối đa **1 phiên**. Đăng nhập lại trên cùng loại thiết bị sẽ **đá** thiết bị cũ cùng loại đó.
> Prefix REST `/api/v1`. Cần `Authorization: Bearer` (trừ chính `/auth/login`).

---

## Khái niệm

| `deviceType` | Nguồn | Tối đa phiên / tài khoản | Khi login lại cùng loại |
|---|---|---|---|
| `WEB` | Trình duyệt (Next.js web) | 1 | Đá phiên WEB cũ |
| `MOBILE` | App mobile riêng | 1 | Đá phiên MOBILE cũ |
| `DESKTOP` | Electron (`halo-chat`, exe/deb) | 1 | Đá phiên DESKTOP cũ |

→ Tối đa **3 phiên đồng thời** (mỗi loại 1). Một thiết bị **WEB** mới đăng nhập **không** ảnh hưởng phiên `MOBILE`/`DESKTOP` — chỉ đá phiên `WEB` trước đó.

> 💡 Thiết bị bị đá sẽ nhận `401 AUTH_SESSION_REVOKED` ở lần gọi REST refresh kế tiếp, và socket nhận `force_logout` → tự về `/login`. Xem mục [Bị đá phiên](#bị-đá-phiên-session-revoked).

---

## 1. Đăng nhập gửi `deviceType`

Từ giờ **mọi** lần login phải kèm `deviceType`. Cùng 1 codebase web/Electron tự suy ra loại thiết bị:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "john_doe",          // hoặc email
  "password": "Password123",
  "deviceType": "WEB",             // BẮT BUỘC: WEB | MOBILE | DESKTOP
  "deviceName": "Chrome trên Windows"   // optional, ≤ 100 ký tự
}
```

- `deviceType`: **bắt buộc**. Thiếu / sai giá trị → `400 VALIDATION_ERROR`.
- `deviceName`: optional, hiển thị trong danh sách "Thiết bị đăng nhập". Nếu bỏ trống, UI fallback theo nhãn loại thiết bị.

### FE suy ra `deviceType` ở đâu

Helper `src/lib/device/device-info.ts`:

```ts
import { getDeviceType, getDeviceName } from '@/lib/device/device-info';

getDeviceType(); // isElectron() ? 'DESKTOP' : 'WEB'
getDeviceName(); // "Halo Desktop · Windows" | "Chrome trên macOS" | undefined
```

- `getDeviceType()` dùng `isElectron()`: Electron (file cài exe/deb) → `DESKTOP`; trình duyệt → `WEB`.
- `getDeviceName()` best-effort, không bao giờ throw; trả `undefined` khi không xác định (SSR / không có `navigator`).

Đã wire sẵn ở `useLogin` (`src/features/auth/hooks/use-mutations.ts`) → `authApi.login`:

```ts
authApi.login({ ...input, deviceType: getDeviceType(), deviceName: getDeviceName() });
```

→ App **không cần** tự gắn `deviceType` ở mỗi chỗ gọi login; chỉ truyền `username`/`password` như cũ.

---

## 2. Bị đá phiên (session revoked)

Khi một thiết bị bị đá (login cùng loại ở nơi khác, hoặc bị revoke từ tab "Thiết bị đăng nhập"), FE **đã** xử lý sẵn, không cần code thêm:

| Kênh | Tín hiệu | File xử lý |
|---|---|---|
| REST | `401` body `code: "AUTH_SESSION_REVOKED"` (ở lần refresh kế tiếp) | `src/lib/api/client.ts` → gọi `onUnauthorized()` |
| WebSocket | event `force_logout` `{ reason: "SESSION_REPLACED" }` | `src/lib/ws/socket.ts` |
| WebSocket | `connect_error` với `code: "AUTH_SESSION_REVOKED"` | `src/lib/ws/socket.ts` (chặn auto-reconnect token cũ) |

`useChatRealtime` (`src/features/chat/hooks/useChatRealtime.ts`) nhận tín hiệu trên → **xoá session local + redirect `/login` + toast**:

```
"Tài khoản được đăng nhập trên thiết bị khác"
```

> ⚠️ Phiên bị thu hồi sẽ **không** auto-reconnect socket với token cũ — đây là chủ đích để tránh loop. Người dùng phải đăng nhập lại.

---

## 3. Quản lý phiên (UI + API)

### Endpoints

```http
GET /api/v1/auth/sessions
Authorization: Bearer {accessToken}
```

Response `200` (envelope đã unwrap → **mảng** `SessionResponseDto[]`):

```json
[
  {
    "sessionId": "b2c1...e9",
    "deviceType": "WEB",
    "deviceName": "Chrome trên Windows",
    "ipAddress": "203.0.113.7",
    "userAgent": "Mozilla/5.0 ...",
    "createdAt": "2026-06-14T09:00:00.000Z",
    "lastSeenAt": "2026-06-15T02:30:00.000Z",
    "current": true
  },
  {
    "sessionId": "a8f0...12",
    "deviceType": "DESKTOP",
    "deviceName": "Halo Desktop · macOS",
    "ipAddress": null,
    "userAgent": null,
    "createdAt": "2026-06-10T11:00:00.000Z",
    "lastSeenAt": "2026-06-15T01:10:00.000Z",
    "current": false
  }
]
```

- `current: true` = chính thiết bị đang gọi API này.
- `deviceName`/`ipAddress`/`userAgent` có thể `null`.

```http
DELETE /api/v1/auth/sessions/{sessionId}     # đá 1 thiết bị → 204
DELETE /api/v1/auth/sessions                 # đá TẤT CẢ thiết bị khác (giữ phiên hiện tại) → 204
```

| Code | HTTP | Khi nào |
|---|---|---|
| `AUTH_SESSION_NOT_FOUND` | 404 | `sessionId` không tồn tại / không thuộc tài khoản |

### Hooks FE

`src/features/settings/hooks/use-sessions.ts`:

| Hook | Việc |
|---|---|
| `useSessions()` | `GET /auth/sessions` → `UserSessionInfo[]` |
| `useRevokeSession()` | `DELETE /auth/sessions/:id`, invalidate danh sách |
| `useRevokeOtherSessions()` | `DELETE /auth/sessions`, invalidate danh sách |

Type `UserSessionInfo` ở `src/features/settings/types.ts`; transport ở `src/services/sessions.api.ts`; query key `sessionKeys` ở `src/services/keys.ts`.

### UI — tab "Thiết bị đăng nhập"

`src/features/settings/components/tabs/DevicesTab.tsx` (trong Settings):

- Liệt kê các phiên, **thiết bị hiện tại lên đầu** kèm badge "Thiết bị này".
- Mỗi thiết bị khác có nút **Đăng xuất** (gọi `useRevokeSession`).
- Nút **Đăng xuất tất cả thiết bị khác** (gọi `useRevokeOtherSessions`) — có confirm dialog.

> 💡 Thiết bị **hiện tại không tự đá** ở đây — muốn thoát phiên hiện tại thì dùng **Đăng xuất** thường ([01-authentication.md](./01-authentication.md#14-logout)).

---

## Bảng tham chiếu code FE

| Quan tâm | File |
|---|---|
| Suy ra `deviceType`/`deviceName` | `src/lib/device/device-info.ts` |
| Transport REST các session endpoint | `src/services/sessions.api.ts` |
| Hooks list/revoke/revoke-others | `src/features/settings/hooks/use-sessions.ts` |
| UI tab "Thiết bị đăng nhập" | `src/features/settings/components/tabs/DevicesTab.tsx` |
| Bắt 401 `AUTH_SESSION_REVOKED` (REST) | `src/lib/api/client.ts` |
| Bắt `force_logout` / `connect_error` (WS) | `src/lib/ws/socket.ts` |
| Clear session + về `/login` + toast | `src/features/chat/hooks/useChatRealtime.ts` |

---

**Liên quan:**
- 🔐 Đăng nhập / logout / refresh → [01-authentication.md](./01-authentication.md)
- ⚠️ Mã lỗi (`AUTH_SESSION_REVOKED`, `AUTH_SESSION_NOT_FOUND`, `VALIDATION_ERROR`) → [12-error-codes.md](./12-error-codes.md)
