# 24 — Profile cá nhân & tìm `@username`

> Xem/sửa hồ sơ của mình, xem hồ sơ user khác, và tìm chính xác 1 user bằng cú pháp `@username`.
> Mọi ID là **Keycloak UUID** (= `user.id`). Prefix REST `/api/v1`. Cần `Authorization: Bearer`.

> 💡 **Biệt danh** (đặt tên gọi riêng cho người khác) giờ là **per-conversation** — đặt trong từng
> cuộc trò chuyện và lưu ở `members[].nickname`. Xem [03-conversations.md](./03-conversations.md#đặt-biệt-danh-nickname-cho-thành-viên).
> (Bảng alias toàn cục cũ — field `customName` — đã bị gỡ.)

4 phần:
- [Lấy hồ sơ của tôi](#1-lấy-hồ-sơ-của-tôi)
- [Cập nhật hồ sơ](#2-cập-nhật-hồ-sơ)
- [Xem hồ sơ user khác](#3-xem-hồ-sơ-user-khác)
- [Tìm chính xác bằng `@username`](#5-tìm-chính-xác-bằng-username)

---

## Nguồn dữ liệu — đọc trước

- `username`, `email` **do Keycloak quản lý** → **read-only**, không sửa qua API này.
- `displayName`, `bio`, `gender`, `dateOfBirth`, `avatar`, `cover` thuộc Profile → **user tự sửa**.
  Khi user tự đổi `displayName`/avatar, hệ thống sẽ **không cho Keycloak ghi đè** nữa.
- **Avatar/cover dùng `mediaId`** (không phải URL): FE upload ảnh qua
  [14-media-upload.md](./14-media-upload.md) (category `AVATAR`) để lấy `mediaId`, rồi gửi `mediaId`
  vào API profile. BE tự ký URL hiển thị và **ký lại mỗi lần đọc** ở `/users/me` & `/users/:id`
  nên `avatarUrl`/`coverUrl` luôn còn hạn.

---

## 1. Lấy hồ sơ của tôi

```http
GET /api/v1/users/me
Authorization: Bearer ...
```

Response `200` — `UserResponseDto` (bản gọn, đã sync mirror từ Keycloak):
```json
{
  "success": true,
  "data": {
    "id": "9d8b14cf-5392-452f-9ce3-557ded65d2d6",
    "username": "huytq",
    "email": "huytq203@gmail.com",
    "displayName": "Trần Quang Huy",
    "avatarUrl": "https://cdn.../avatar.png?X-Amz-...",
    "coverUrl": null,
    "bio": null,
    "gender": "UNDISCLOSED",
    "dateOfBirth": null,
    "status": "ACTIVE"
  }
}
```

> Hồ sơ **đầy đủ** (kèm `isMe`, `friendship`) trả ở `GET /users/:id` — xem phần 3.
> Gọi `/users/:id` với chính `id` của mình cũng được (`isMe=true`, `email` có giá trị).

---

## 2. Cập nhật hồ sơ

```http
PATCH /api/v1/users/me
Content-Type: application/json
Authorization: Bearer ...

{
  "displayName": "Huy Trần",
  "bio": "Mê code & cà phê",
  "gender": "MALE",
  "dateOfBirth": "1998-05-20",
  "avatarMediaId": "b1c2d3e4-...-uuid-v4",
  "coverMediaId": "f5a6b7c8-...-uuid-v4"
}
```

**Tất cả field đều optional** — chỉ field gửi lên mới được cập nhật (PATCH partial).

| Field | Kiểu | Ràng buộc | Gửi `null` để… |
|---|---|---|---|
| `displayName` | string | 1–100 ký tự (trim) | — (không cho rỗng) |
| `bio` | string \| null | tối đa 255 ký tự (trim) | xoá bio |
| `gender` | enum | `MALE` \| `FEMALE` \| `OTHER` \| `UNDISCLOSED` | — |
| `dateOfBirth` | string \| null | ISO date `YYYY-MM-DD` | xoá ngày sinh |
| `avatarMediaId` | string(uuid) \| null | `mediaId` của ảnh category `AVATAR` đã upload xong | gỡ avatar |
| `coverMediaId` | string(uuid) \| null | `mediaId` ảnh đã upload xong | gỡ ảnh bìa |

Response `200` — **`UserProfileResponseDto`** (bản đầy đủ, `isMe=true`):
```json
{
  "success": true,
  "data": {
    "id": "9d8b14cf-...",
    "username": "huytq",
    "email": "huytq203@gmail.com",
    "displayName": "Huy Trần",
    "avatarUrl": "https://cdn.../avatar.png?X-Amz-...",
    "coverUrl": "https://cdn.../cover.png?X-Amz-...",
    "bio": "Mê code & cà phê",
    "gender": "MALE",
    "dateOfBirth": "1998-05-20",
    "status": "ACTIVE",
    "isMe": true,
    "friendship": "NONE"
  }
}
```

### Flow đổi avatar/cover (2 bước)

```ts
// 1) Upload ảnh → lấy mediaId (xem 14-media-upload.md)
const { data: media } = await uploadDirect(file, 'AVATAR'); // POST /api/v1/media/upload
// media.id = mediaId, media.status === 'READY'

// 2) Gán vào profile
await fetch('/api/v1/users/me', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ avatarMediaId: media.id }),
});
```

Lỗi:
| Code | HTTP | Khi nào |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Sai format (đọc `details[]`) — vd `dateOfBirth` không phải ngày |
| `MEDIA_NOT_FOUND` | 404 | `avatarMediaId`/`coverMediaId` không tồn tại hoặc **không thuộc bạn** |
| `MEDIA_NOT_UPLOADED` | 400 | Media chưa upload xong (chưa READY) — confirm upload trước |

---

## 3. Xem hồ sơ user khác

```http
GET /api/v1/users/{id}        # id = keycloakId (UUID v4)
Authorization: Bearer ...
```

Response `200` — **`UserProfileResponseDto`** (viewer-scoped):
```json
{
  "success": true,
  "data": {
    "id": "aa11...",
    "username": "lanphuong",
    "email": null,
    "displayName": "Lan Phương",
    "avatarUrl": "https://cdn.../...",
    "coverUrl": null,
    "bio": "Hà Nội",
    "gender": "FEMALE",
    "dateOfBirth": null,
    "status": "ACTIVE",
    "isMe": false,
    "friendship": "ACCEPTED"
  }
}
```

Quy tắc:
- `email` **chỉ trả khi `isMe=true`** (xem hồ sơ chính mình). Người khác luôn nhận `null`.
- `friendship`: `NONE` | `PENDING_OUT` | `PENDING_IN` | `ACCEPTED` | `BLOCKED_BY_ME` (xem [06](./06-friends-blocks.md#friendship-quyết-định-ui)).
- **Hiển thị tên**: profile dùng `displayName`. Biệt danh riêng (nếu có) là **per-conversation** —
  chỉ áp dụng bên trong cuộc trò chuyện, xem [03-conversations.md](./03-conversations.md#đặt-biệt-danh-nickname-cho-thành-viên).

Lỗi: `USER_NOT_FOUND` (404) — không tồn tại **hoặc** user đó đang chặn bạn (cố tình ẩn để chống dò tìm).

---

## 5. Tìm chính xác bằng `@username`

Cùng endpoint search ([06](./06-friends-blocks.md#search-user-để-kết-bạn)), nhưng nếu `q` **bắt đầu bằng `@`**
→ tìm **chính xác 1 user** theo `username` (định danh duy nhất), thay vì prefix nhiều kết quả.

```http
GET /api/v1/users/search?q=@ad1
Authorization: Bearer ...
```

Response `200` — trả tối đa **1 item**, `nextCursor` luôn `null`:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "9d8b14cf-...",
        "username": "ad1",
        "email": "ad1@example.com",
        "displayName": "Admin One",
        "avatarUrl": null,
        "friendship": "NONE"
      }
    ],
    "nextCursor": null
  }
}
```

Quy tắc:
- Khớp **chính xác** `username` (không phân biệt hoa/thường), không phải prefix.
- Không tìm thấy → `items: []`. Self / user đã chặn bạn / `DELETED`/`BANNED` → cũng `[]`.
- `q` vẫn cần **tối thiểu 2 ký tự** (vd `@a` hợp lệ; chỉ mỗi `@` thì lỗi `VALIDATION_ERROR`).

```ts
// Phân biệt 2 chế độ ở FE
const q = input.startsWith('@') ? input.trim() : input.trim();
// '@ad1' → tìm đúng 1 user; 'ad'  → prefix nhiều kết quả + cursor pagination
```

---

**Liên quan:**
- 🏷️ Đặt biệt danh (nickname) per-conversation → [03-conversations.md](./03-conversations.md#đặt-biệt-danh-nickname-cho-thành-viên)
- 🔎 Search prefix + cursor + bảng `friendship` → [06-friends-blocks.md](./06-friends-blocks.md)
- 🖼️ Upload avatar/cover lấy `mediaId` → [14-media-upload.md](./14-media-upload.md)
- 🔗 Chia sẻ hồ sơ qua link/QR → [25-share-links.md](./25-share-links.md)
- ⚠️ Mã lỗi → [12-error-codes.md](./12-error-codes.md)
