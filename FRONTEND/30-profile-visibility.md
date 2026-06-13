# 30 — Quyền riêng tư hồ sơ (Public / Private) + chia sẻ cá nhân

> Cho phép user đặt hồ sơ **PUBLIC** (mặc định) hoặc **PRIVATE**. Khi PRIVATE: **không ai search ra** (kể cả `@username`), chỉ tiếp cận được qua **link/QR chia sẻ**.
> Prefix REST `/api/v1`. Cần `Authorization: Bearer`.

---

## Khái niệm

| `visibility` | Search ([06](./06-friends-blocks.md), [24](./24-profile.md)) | Qua link/QR ([25](./25-share-links.md)) | Xem profile trực tiếp `/users/{id}` |
|---|---|---|---|
| `PUBLIC` (mặc định) | ✅ tìm được | ✅ | ✅ |
| `PRIVATE` | ❌ **ẩn hoàn toàn** khỏi kết quả search | ✅ | ✅ (nếu biết id) |

> Đây là cơ chế tương tự `isPublic` của nhóm, nhưng cho **hồ sơ cá nhân**.

Hồ sơ trả về (`GET /users/me`, `GET /users/{id}`, `PATCH /users/me`) giờ có thêm field `visibility`:
```jsonc
{ "id": "…", "username": "huytq", "displayName": "Huy", "visibility": "PUBLIC", "isMe": true, "...": "" }
```

---

## 1. Đổi chế độ hiển thị

```http
PATCH /api/v1/users/me
Authorization: Bearer ...
Content-Type: application/json

{ "visibility": "PRIVATE" }
```

- `visibility`: `"PUBLIC"` | `"PRIVATE"`. Có thể gửi cùng các field hồ sơ khác ([24-profile.md](./24-profile.md)).
- Response `200`: hồ sơ đầy đủ đã cập nhật.

| Code | HTTP | Khi nào |
|---|---|---|
| `VALIDATION_ERROR` | 400 | `visibility` không phải PUBLIC/PRIVATE |

---

## 2. Ảnh hưởng tới search

Khi bạn để PRIVATE, **mọi người khác** gọi:
- `GET /users/search?q=...` (prefix tên/username/email/phone)
- `GET /users/search?q=@username` (tìm chính xác)

đều **không thấy bạn** trong kết quả. Bạn vẫn xuất hiện bình thường ở những nơi đã có quan hệ: danh bạ/bạn bè, thành viên nhóm chung, người gửi tin trong hội thoại — privacy chỉ chặn **khám phá mới qua search**.

Để người khác vẫn kết bạn được khi bạn PRIVATE → **chia sẻ link/QR cá nhân** (mục 3).

---

## 3. Chia sẻ link & QR cá nhân — dành cho mobile

Link/QR cá nhân (`type: "USER"` trong [25-share-links.md](./25-share-links.md)) là **đường tiếp cận duy nhất** tới hồ sơ PRIVATE. Người nhận mở link → `POST /share-links/{code}/use` trả hồ sơ đầy đủ để gửi lời mời kết bạn, **bỏ qua** giới hạn search.

> ⚠️ **Định hướng sản phẩm:** tính năng **tạo/chia sẻ link & QR cá nhân** dự kiến **chỉ xuất hiện trên app mobile** (web tạm ẩn UI tạo link USER). BE **không** chặn theo nền tảng — endpoint vẫn hoạt động cho mọi client; việc giới hạn hiển thị do FE quyết định. Link USER do người khác mở vẫn resolve được trên mọi nền tảng.

---

**Liên quan:**
- 👤 Hồ sơ + sửa profile → [24-profile.md](./24-profile.md)
- 🔎 Search & kết bạn → [06-friends-blocks.md](./06-friends-blocks.md)
- 🔗 Link & QR chia sẻ → [25-share-links.md](./25-share-links.md)
- ⚠️ Mã lỗi → [12-error-codes.md](./12-error-codes.md)
