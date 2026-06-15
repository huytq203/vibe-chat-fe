# Vibe Chat — Frontend Integration Guide

> Tài liệu cho FE team integrate với Vibe Chat backend (NestJS + REST + Socket.io).
> Backend: `http://localhost:3000` (dev). WebSocket namespace: `/chat`.
> Swagger doc đầy đủ: `http://localhost:3000/api/docs`.

---

## Đọc thế nào?

Folder này tách theo **chủ đề**. Đọc cái cần dùng — không cần đọc tuần tự.

### 🔧 Nền tảng (đọc trước)

| File | Đọc khi |
|---|---|
| [01-authentication.md](./01-authentication.md) | Setup login/logout/refresh token, JWT |
| [31-multi-device-sessions.md](./31-multi-device-sessions.md) | Đăng nhập đa thiết bị (`deviceType`), bị đá phiên, quản lý "Thiết bị đăng nhập" |
| [02-response-envelope.md](./02-response-envelope.md) | Hiểu format success/error response |
| [12-error-codes.md](./12-error-codes.md) | Tra cứu code lỗi để bắt đúng |

### 💬 Chat (đọc khi build feature chat)

| File | Đọc khi |
|---|---|
| [03-conversations.md](./03-conversations.md) | CRUD conversation (direct/group, list, **ghim**, **xoá**) |
| [16-group-members.md](./16-group-members.md) | Thêm thành viên, **xin vào nhóm** (join request), duyệt/từ chối |
| [28-group-settings.md](./28-group-settings.md) | **Cài đặt nhóm**: đổi tên, **quyền hạn** (join link/phê duyệt/quyền chat/ghim), **chặn thành viên** |
| [29-pinned-messages.md](./29-pinned-messages.md) | **Ghim tin nhắn** (1-1 + nhóm, tối đa 5) |
| [04-messages.md](./04-messages.md) | Gửi/nhận tin nhắn, mention `@user`, đánh dấu đọc |
| [15-edit-recall-selfdestruct.md](./15-edit-recall-selfdestruct.md) | Sửa tin (5 phút), gỡ tin, tin tự huỷ |
| [14-media-upload.md](./14-media-upload.md) | Upload ảnh/video/voice/file rồi gắn vào tin nhắn |
| [08-websocket.md](./08-websocket.md) | Connect socket, lắng nghe event realtime |
| [09-encryption.md](./09-encryption.md) | Mã hoá SERVER — FE chỉ gửi plaintext, BE tự encrypt |
| [18-conversation-lock.md](./18-conversation-lock.md) | **Khoá conversation** bằng password — ẩn khỏi list, mở bằng verify |
| [19-media-url-caching.md](./19-media-url-caching.md) | Cache ảnh/video — signed URL bất biến theo time-window, không tải lại |
| [20-shared-content.md](./20-shared-content.md) | Tab Ảnh & Video / Tài liệu / Liên kết — lấy toàn bộ lịch sử theo loại |
| [21-message-search.md](./21-message-search.md) | **Tìm tin nhắn** theo từ khoá trong 1 conversation (group/direct) |
| [22-mute-notifications.md](./22-mute-notifications.md) | **Tắt thông báo** (mute) per-conversation — chặn push FCM, vẫn giữ tin + badge |
| [23-calls.md](./23-calls.md) | **Gọi audio/video** (LiveKit + Socket.IO `/call`) — ring/accept/decline, 1-1 + group |
| ~~[17-switch-encryption.md](./17-switch-encryption.md)~~ | ~~Switch E2E~~ — **DEPRECATED, đã xoá** |
| [10-idempotency.md](./10-idempotency.md) | Retry tin nhắn an toàn với `clientNonce` |

### 👥 Bạn bè + Presence

| File | Đọc khi |
|---|---|
| [05-presence.md](./05-presence.md) | Trạng thái online + label "5 phút trước" |
| [06-friends-blocks.md](./06-friends-blocks.md) | Search user, kết bạn, chặn |
| [24-profile.md](./24-profile.md) | **Hồ sơ cá nhân** (sửa tên/bio/giới tính/ngày sinh/avatar/cover), xem profile user khác, tìm **`@username`** |
| [30-profile-visibility.md](./30-profile-visibility.md) | **Quyền riêng tư hồ sơ** PUBLIC/PRIVATE — PRIVATE ẩn khỏi search, chỉ qua link/QR (chia sẻ cá nhân = mobile) |
| [25-share-links.md](./25-share-links.md) | **Chia sẻ link cá nhân & nhóm + QR** — thu hồi, hết hạn, giới hạn lượt |
| [26-common-groups.md](./26-common-groups.md) | **Nhóm chung** với 1 user khác — tab "Nhóm chung" trong profile, cursor-based |

### 🔔 Notification + Push

| File | Đọc khi |
|---|---|
| [07-notifications.md](./07-notifications.md) | Inbox + FCM token + 5 loại noti |
| [11-push-fcm.md](./11-push-fcm.md) | Setup Firebase FE + Service Worker end-to-end |

### 📖 Cookbook

| File | Đọc khi |
|---|---|
| [13-cookbook.md](./13-cookbook.md) | Sao chép sample flow hoàn chỉnh |

---

## Quy ước chung

- **Prefix REST**: `/api/v1`
- **ID public**: UUID v4. FE không bao giờ thấy ObjectId/BIGINT nội bộ.
- **`user.id` = `keycloakId`** — dùng đồng nhất ở mọi nơi (`senderId`, `memberIds`, `userId`…).
- **Ngày tháng**: ISO 8601 string (`"2026-05-25T08:00:00.000Z"`).
- **Tiếng Việt** cho error message (hiện thẳng cho user). `code` là UPPER_SNAKE để FE bắt.

## Môi trường (FE `.env`)

```bash
BACKEND_URL=http://localhost:3000
WS_URL=ws://localhost:3000/chat
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=vibe
KEYCLOAK_CLIENT_ID=vibe-frontend

# Firebase Cloud Messaging (cho push notification)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

## Swagger interactive

`http://localhost:3000/api/docs` — bấm **Authorize** → dán `accessToken` → test mọi endpoint trực tiếp.

## Liên hệ BE

- Bug / feature request → tag BE team trong issue.
- Lỗi `ENCRYPTION_FAILED` / `INTERNAL_ERROR` → gửi `requestId` + thời gian cho BE để trace log.
