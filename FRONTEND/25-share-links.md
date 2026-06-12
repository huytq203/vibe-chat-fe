# 25 — Share link cá nhân & nhóm (+ QR)

> Tạo link chia sẻ **hồ sơ cá nhân** hoặc **nhóm chat**, truy cập qua **URL hoặc mã QR**.
> Link **thu hồi được**, hỗ trợ **hết hạn** và **giới hạn số lượt dùng**.
> Prefix REST `/api/v1`. Mọi endpoint cần `Authorization: Bearer`.

4 phần:
- [Tạo link](#1-tạo-link)
- [Danh sách link của tôi](#2-danh-sách-link-của-tôi)
- [Xem trước link (resolve)](#3-xem-trước-link-resolve)
- [Dùng link (kết bạn / vào nhóm)](#4-dùng-link)
- [Thu hồi link](#5-thu-hồi-link)

---

## Khái niệm

- Mỗi link có **`code`** (chuỗi ngẫu nhiên). URL công khai: `{APP_PUBLIC_URL}/i/{code}`
  (BE trả sẵn field `url`). FE chỉ cần share `url` hoặc hiển thị `qrDataUrl`.
- `type`:
  - **`USER`** → trỏ tới **hồ sơ của chính người tạo** (không cần `targetId`).
  - **`GROUP`** → trỏ tới 1 nhóm; người tạo phải là **OWNER/ADMIN/MODERATOR** của nhóm đó.
- **QR**: BE sinh sẵn ảnh QR dạng **data URL PNG** (`qrDataUrl`) → FE gắn thẳng vào `<img src={qrDataUrl} />`,
  không cần thư viện QR ở client.
- Vòng đời: link "chết" khi **bị thu hồi** (`isRevoked`), **hết hạn** (`expiresAt`), hoặc **hết lượt** (`usedCount >= maxUses`).

---

## 1. Tạo link

```http
POST /api/v1/share-links
Content-Type: application/json
Authorization: Bearer ...

{
  "type": "USER",
  "maxUses": 50,          // optional — bỏ trống = không giới hạn
  "expiresInDays": 7,     // optional — bỏ trống = vĩnh viễn (1..365)
  "label": "Link card visit"  // optional
}
```

Tạo link **nhóm**:
```json
{ "type": "GROUP", "targetId": "<conversation-uuid>", "expiresInDays": 30 }
```

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `type` | ✅ | `USER` \| `GROUP` |
| `targetId` | chỉ khi `GROUP` | UUID nhóm. `USER` bỏ qua (luôn trỏ về chính bạn). |
| `maxUses` | ❌ | Số lượt tối đa (1..100000). Bỏ trống = không giới hạn. |
| `expiresInDays` | ❌ | Số ngày hết hạn (1..365). Bỏ trống = vĩnh viễn. |
| `label` | ❌ | Nhãn gợi nhớ (≤150 ký tự). `GROUP` mặc định lấy tên nhóm nếu bỏ trống. |

Response `201` — **`ShareLinkResponseDto`**:
```json
{
  "success": true,
  "data": {
    "code": "Ab12Cd34Ef56Gh78",
    "type": "USER",
    "url": "https://app.vibe.chat/i/Ab12Cd34Ef56Gh78",
    "qrDataUrl": "data:image/png;base64,iVBORw0KGgoAAA...",
    "targetId": "9d8b14cf-...",        // USER: keycloakId; GROUP: uuid nhóm
    "label": "Link card visit",
    "maxUses": 50,
    "usedCount": 0,
    "expiresAt": "2026-06-18T10:00:00.000Z",   // null nếu vĩnh viễn
    "isRevoked": false,
    "createdAt": "2026-06-11T10:00:00.000Z"
  }
}
```

Lỗi:
| Code | HTTP | Khi nào |
|---|---|---|
| `SHARE_LINK_TARGET_INVALID` | 403 | `type=GROUP` nhưng thiếu `targetId` |
| `CONVERSATION_NOT_FOUND` | 404 | UUID nhóm sai |
| `CONVERSATION_NOT_GROUP` | 400 | `targetId` là DIRECT, không phải nhóm |
| `CONVERSATION_INSUFFICIENT_ROLE` | 403 | Bạn không phải OWNER/ADMIN/MODERATOR của nhóm |
| `VALIDATION_ERROR` | 400 | Sai format field |

Hiển thị QR:
```tsx
<img src={data.qrDataUrl} alt="QR" width={240} height={240} />
<button onClick={() => navigator.clipboard.writeText(data.url)}>Copy link</button>
```

---

## 2. Danh sách link của tôi

```http
GET /api/v1/share-links/me
Authorization: Bearer ...
```

Response `200`: mảng `ShareLinkResponseDto` (tối đa 100 mới nhất, mỗi item kèm `url` + `qrDataUrl`).
```json
{ "success": true, "data": [ { "code": "...", "type": "GROUP", "url": "...", "usedCount": 3, ... } ] }
```

---

## 3. Xem trước link (resolve)

Dùng khi user mở `/i/{code}` — hiển thị **preview** trước khi quyết định kết bạn/vào nhóm.
**Không tiêu hao lượt dùng.**

```http
GET /api/v1/share-links/{code}
Authorization: Bearer ...
```

Response `200` — **`ResolveShareLinkResponseDto`**:
```jsonc
{
  "success": true,
  "data": {
    "code": "Ab12Cd34Ef56Gh78",
    "type": "GROUP",
    "url": "https://app.vibe.chat/i/Ab12Cd34Ef56Gh78",
    "isActive": true,        // còn dùng được không
    "isRevoked": false,
    "isExpired": false,
    "isExhausted": false,
    "user": null,            // có giá trị khi type=USER
    "group": {               // có giá trị khi type=GROUP
      "id": "<conversation-uuid>",
      "name": "Nhóm Dev",
      "description": "Phòng kỹ thuật",
      "avatarUrl": null,
      "memberCount": 12
    }
  }
}
```

Với `type=USER`, `user` có shape:
```json
{ "id": "9d8b14cf-...", "username": "huytq", "displayName": "Huy", "avatarUrl": null }
```

- `user`/`group` có thể `null` nếu target đã bị xoá.
- Dùng `isActive` để bật/tắt nút hành động. Nếu `false`, đọc `isRevoked`/`isExpired`/`isExhausted` để hiện đúng lý do.

---

## 4. Dùng link

Thực hiện hành động của link. **Tiêu hao 1 lượt** (`usedCount++`) khi thành công.

```http
POST /api/v1/share-links/{code}/use
Authorization: Bearer ...
```

Response `200` — **`UseShareLinkResponseDto`**:

**`type=USER`** → trả hồ sơ đầy đủ để FE hiển thị + gọi kết bạn ([06](./06-friends-blocks.md)):
```json
{
  "success": true,
  "data": {
    "type": "USER",
    "user": { "id": "...", "username": "huytq", "displayName": "Huy", "customName": null,
              "avatarUrl": null, "coverUrl": null, "bio": null, "gender": "UNDISCLOSED",
              "dateOfBirth": null, "status": "ACTIVE", "isMe": false, "friendship": "NONE" },
    "group": null
  }
}
```

**`type=GROUP`** → **vào nhóm trực tiếp** (bỏ qua bước duyệt join-request):
```json
{
  "success": true,
  "data": {
    "type": "GROUP",
    "user": null,
    "group": { "conversationId": "<conversation-uuid>", "joined": true }
  }
}
```
- `joined: true` = vừa được thêm vào nhóm; `false` = bạn đã là thành viên (mở thẳng nhóm).
- Sau khi joined, BE phát WS `conversation:member-added` như flow add member ([16](./16-group-members.md)).

Lỗi:
| Code | HTTP | Khi nào | FE nên làm |
|---|---|---|---|
| `SHARE_LINK_NOT_FOUND` | 404 | `code` sai | "Link không tồn tại" |
| `SHARE_LINK_REVOKED` | 410 | Đã thu hồi | "Link đã bị thu hồi" |
| `SHARE_LINK_EXPIRED` | 410 | Hết hạn | "Link đã hết hạn" |
| `SHARE_LINK_EXHAUSTED` | 410 | Hết lượt dùng | "Link đã hết lượt" |
| `CONVERSATION_MEMBER_BANNED` | 403 | Bạn bị cấm khỏi nhóm | "Bạn đã bị cấm khỏi nhóm" |
| `CONVERSATION_FULL` | 400 | Nhóm đã đầy | "Nhóm đã đầy" |

> 3 mã `SHARE_LINK_*` ở trên dùng **HTTP 410 Gone** — gom chung nhánh "link không còn hiệu lực".

---

## 5. Thu hồi link

```http
DELETE /api/v1/share-links/{code}
Authorization: Bearer ...
```

Response `200`: `{ "success": true, "data": { "ok": true } }`. Chỉ **chủ link** thu hồi được.

Lỗi: `SHARE_LINK_NOT_FOUND` (404), `SHARE_LINK_FORBIDDEN` (403 — không phải chủ link).

---

## Flow mẫu — mở deep link `/i/{code}`

```ts
async function openInvite(code: string) {
  const { data } = await api.get(`/share-links/${code}`);   // resolve, không tốn lượt
  if (!data.isActive) return showInactive(data);            // revoked/expired/exhausted

  if (data.type === 'USER') {
    renderProfileCard(data.user);                           // hiện hồ sơ + nút "Kết bạn"
  } else {
    renderGroupCard(data.group);                            // hiện info nhóm + nút "Tham gia"
  }
}

async function confirmUse(code: string) {
  const { data } = await api.post(`/share-links/${code}/use`);
  if (data.type === 'GROUP') router.push(`/c/${data.group.conversationId}`);
  else openFriendRequestDialog(data.user);                  // POST /friends/requests
}
```

---

**Liên quan:**
- 👤 Hồ sơ + `@username` + biệt danh → [24-profile.md](./24-profile.md)
- 👥 Kết bạn sau khi mở link USER → [06-friends-blocks.md](./06-friends-blocks.md)
- 👥 Quản lý thành viên nhóm + join request → [16-group-members.md](./16-group-members.md)
- ⚠️ Mã lỗi → [12-error-codes.md](./12-error-codes.md)
