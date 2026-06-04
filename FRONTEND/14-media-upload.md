# 14 — Media Upload (ảnh / video / voice / file)

> Upload ảnh, video, voice, file đính kèm rồi gắn vào tin nhắn chat.
> Backend lưu object trên storage S3-compatible (MinIO, sau này R2/S3) — FE **chỉ làm việc qua REST `/api/v1/media`**, không bao giờ chạm thẳng vào storage credentials.

Tất cả endpoint require JWT (`Authorization: Bearer <accessToken>`).

---

## TL;DR — chọn cách upload theo dung lượng

| File | Cách | Endpoint | Vì sao |
|---|---|---|---|
| Ảnh, avatar, thumbnail (**≤ 10 MB**) | **A — upload trực tiếp** | `POST /media/upload` | 1 request, đơn giản |
| Video, voice, file lớn (**> 10 MB**) | **B — presigned URL** | `POST /media/presign` → `PUT` thẳng storage → `POST /media/:id/confirm` | File không đi qua backend → nhẹ tải server |

> Quy tắc: file lớn (video/voice) **bắt buộc** dùng Cách B. Cách A có hard limit ở backend nhưng sẽ nghẽn server nếu lạm dụng với file to.

## Category & giới hạn (do backend enforce)

`category` quyết định bucket lưu + rule validate (mime + size). FE phải gửi đúng `category`:

| `category` | Dùng cho | MIME cho phép | Max size |
|---|---|---|---|
| `AVATAR` | Ảnh đại diện | `image/jpeg,png,webp,gif,heic,heif` | 5 MB |
| `THUMBNAIL` | Ảnh thumbnail | (ảnh như trên) | 2 MB |
| `VOICE` | Tin nhắn thoại | `audio/mpeg,mp4,aac,ogg,webm,wav` | 25 MB |
| `VIDEO` | Video | `video/mp4,webm,quicktime,x-matroska` | 200 MB |
| `ATTACHMENT` | File đính kèm trong tin nhắn (ảnh/video/audio/tài liệu/**code-text**/zip…) | **validate theo ĐUÔI file** (xem dưới) | 50 MB |

> Cho **ảnh/video gửi trong chat** → dùng `category: "ATTACHMENT"` (hoặc `VIDEO` cho video lớn). `AVATAR`/`THUMBNAIL` chỉ dành cho ảnh hệ thống.
> Validate sai định dạng → `400 MEDIA_INVALID_TYPE`. Vượt size → `422 MEDIA_TOO_LARGE`.

#### `ATTACHMENT` validate theo ĐUÔI file (không theo MIME)

File code/text có MIME do trình duyệt/OS báo **không đáng tin** (vd `.ts` → `text/vnd.trolltech.linguist`, `video/mp2t`, hoặc rỗng). Nên riêng `ATTACHMENT` backend **kiểm tra theo đuôi file**, không theo `Content-Type`:

- ✅ **Cho phép (default-deny — chỉ các đuôi này):** ảnh (`jpg,png,webp,gif,heic,svg…`), video (`mp4,webm,mov,mkv…`), audio (`mp3,m4a,aac,ogg,wav,opus`), tài liệu (`pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,md,rtf`), dữ liệu/config (`json,xml,yaml,yml,toml,ini,env,log,sql`), **code** (`ts,tsx,js,jsx,py,go,rs,java,kt,c,h,cpp,cs,rb,php,swift,sh,bash,html,css,scss,vue,dart,lua,r…`), archive (`zip,rar,7z,tar,gz`).
- ✅ **File KHÔNG đuôi** (`Dockerfile`, `Makefile`, `LICENSE`, `README`, `.gitignore`, `.env`…) → **được phép** (không thể là executable Windows — loại đó luôn có đuôi).
- ❌ **Chặn (đuôi thực thi):** `exe,bat,cmd,com,msi,scr,dll,apk,deb,dmg,ps1,vbs,jar…` → `400 MEDIA_INVALID_TYPE`.
- 💡 FE **không cần lo `mimeType` đúng** cho ATTACHMENT — chỉ cần đuôi file hợp lệ. (Với category media khác — `AVATAR/VIDEO/VOICE/THUMBNAIL` — vẫn validate theo MIME như cũ.)

---

## Cách A — Upload trực tiếp (file nhỏ)

`multipart/form-data`, 2 field: `file` + `category`.

```http
POST /api/v1/media/upload
Content-Type: multipart/form-data
```

```ts
async function uploadDirect(file: File, category = 'ATTACHMENT') {
  const form = new FormData();
  form.append('file', file);
  form.append('category', category);

  const res = await fetch(`${BACKEND_URL}/api/v1/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // KHÔNG set Content-Type — browser tự gắn boundary
    body: form,
  });
  const { data } = await res.json();
  return data as MediaResponse; // status đã = READY, có downloadUrl dùng ngay
}
```

- Throttle: **30 req / phút / user**.
- Response `201` → media đã `READY` ngay, `downloadUrl` xài liền.

## Cách B — Presigned URL (file lớn: video/voice)

3 bước: **presign → PUT thẳng storage → confirm**.

### B1. Xin URL upload

```http
POST /api/v1/media/presign

{
  "category": "VIDEO",
  "fileName": "clip.mp4",
  "mimeType": "video/mp4",
  "fileSize": 10485760
}
```

Response `201`:
```json
{
  "success": true,
  "data": {
    "id": "8d2f...-uuid",
    "uploadUrl": "https://s3.../vibe-videos/uuid.mp4?X-Amz-...",
    "method": "PUT",
    "contentType": "video/mp4",
    "expiresIn": 300
  }
}
```

### B2. PUT file thẳng lên storage

```ts
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': contentType }, // PHẢI khớp đúng mimeType đã khai ở B1
  body: file,
});
```

> ⚠️ Header `Content-Type` khi PUT **bắt buộc khớp** `contentType` server trả về (đã ký vào URL). Sai → storage trả `403 SignatureDoesNotMatch`.
> `uploadUrl` hết hạn sau `expiresIn` giây (mặc định 300s = 5 phút). Hết hạn → xin lại từ B1.
> Đây là request đi **thẳng storage**, KHÔNG kèm `Authorization` header của backend.

### B3. Xác nhận upload xong

```http
POST /api/v1/media/{id}/confirm

{
  "width": 1280,    // optional — ảnh/video
  "height": 720,    // optional — ảnh/video
  "duration": 15    // optional — video/voice (giây)
}
```

- Server `HEAD` object để chắc file đã có trên storage + validate lại size thật → chuyển `PENDING → READY`.
- Response `200` → `MediaResponse` đã `READY`, có `downloadUrl`.
- Chưa PUT mà gọi confirm → `422 MEDIA_NOT_UPLOADED`. Confirm 2 lần → `400 MEDIA_ALREADY_CONFIRMED`.

---

## Gắn media vào tin nhắn chat

Sau khi có media `READY`, gửi tin nhắn như thường (xem [04-messages.md](./04-messages.md)) nhưng:

1. Set `type` đúng: `IMAGE` | `VIDEO` | `AUDIO` | `FILE`.
2. Tham chiếu media qua **`attachmentIds`** (mảng UUID media `READY`, tối đa 10).

```ts
// 1. Upload trước
const media = await uploadDirect(imageFile, 'ATTACHMENT'); // hoặc flow presign cho video

// 2. Gửi message tham chiếu media qua attachmentIds
await fetch(`${BACKEND_URL}/api/v1/conversations/${conversationId}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'IMAGE',
    attachmentIds: [media.id],   // BẮT BUỘC — thiếu → 400 MESSAGE_ATTACHMENT_REQUIRED
    plaintext: 'caption',        // optional — bỏ hẳn field nếu không có caption (đừng gửi '')
  }),
});
```

> Media phải **đã `READY`** và **thuộc về chính người gửi** — sai/chưa upload xong → `400 MEDIA_NOT_FOUND`.
> Server lưu attachment vào message và trả về trong `message.attachments[]` (xem shape ở [04-messages.md](./04-messages.md#message-object--full-shape)).

### Hiển thị khi nhận tin

Tin nhận về có `attachments[]`, mỗi item gồm `mediaId`, `fileName`, `mimeType`, `width`, `height`, `duration` và **`downloadUrl` đã được server ký sẵn** — render được ngay:

```ts
for (const att of message.attachments) {
  if (att.downloadUrl) img.src = att.downloadUrl; // dùng ngay, KHÔNG lưu cứng lâu dài (có hạn)
}
```

> ✅ **Mọi member của conversation** đều nhận được `downloadUrl` (cả người gửi lẫn người nhận) — server tự ký URL theo quyền thành viên, không cần là chủ media.

#### Khi URL hết hạn (ảnh cũ cuộn lại bị lỗi)

`downloadUrl` có TTL. Khi `<img>` lỗi / sắp dùng lại tin cũ, refresh qua endpoint **scoped theo conversation**:

```ts
async function refreshUrl(conversationId: string, mediaId: string) {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/conversations/${conversationId}/attachments/${mediaId}/url`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const { data } = await res.json();
  return data.downloadUrl as string; // data: { mediaId, downloadUrl, expiresIn }
}

img.onerror = async () => {
  img.src = await refreshUrl(message.conversationId, att.mediaId);
};
```

- Chỉ cần là **member** của conversation chứa media đó (không cần là chủ media).
- Media không thuộc conversation → `404 MEDIA_NOT_FOUND`.
- Gợi ý: cache URL phía FE theo `mediaId` + `expiresIn` để tránh refresh thừa.

> ℹ️ `GET /media/:id` (owner-scoped) vẫn tồn tại nhưng chỉ dùng cho media **của chính user** (vd ảnh avatar mình vừa upload). Để hiển thị attachment trong chat → dùng `downloadUrl` nhúng sẵn hoặc endpoint refresh theo conversation ở trên.

---

## MediaResponse — full shape

```ts
{
  id: string;                       // UUID — dùng để tham chiếu / confirm / GET / DELETE
  category: 'AVATAR'|'ATTACHMENT'|'VOICE'|'VIDEO'|'THUMBNAIL';
  status: 'PENDING'|'READY'|'DELETED';
  mimeType: string;                 // 'image/png', 'video/mp4'...
  size: number;                     // byte
  originalName: string;             // tên file gốc (đã sanitize)
  width: number | null;             // px — ảnh/video
  height: number | null;            // px — ảnh/video
  duration: number | null;          // giây — video/voice
  downloadUrl: string | null;       // URL ký sẵn (null khi chưa READY) — có hạn, lấy lại qua GET /media/:id
  createdAt: string;                // ISO date
}
```

## Các endpoint khác

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/v1/media/:id` | Lấy metadata + `downloadUrl` mới (refresh URL hết hạn) |
| `DELETE` | `/api/v1/media/:id` | Xoá media (chỉ chủ sở hữu) → `204` |

> `GET`/`DELETE` chỉ truy được media của **chính user** (lấy ownerId từ JWT). Media của người khác → `404 MEDIA_NOT_FOUND` (giấu sự tồn tại — R-SEC-08).

---

## Error codes (media)

| Code | HTTP | Khi nào |
|---|---|---|
| `MEDIA_FILE_REQUIRED` | 400 | Cách A thiếu field `file` |
| `MEDIA_INVALID_TYPE` | 400 | Media (AVATAR/VIDEO/VOICE/THUMBNAIL): MIME ngoài whitelist. ATTACHMENT: đuôi file không được phép (vd `.exe`) |
| `MEDIA_TOO_LARGE` | 422 | File vượt giới hạn dung lượng của `category` |
| `MEDIA_NOT_UPLOADED` | 422 | Gọi confirm khi file chưa có trên storage |
| `MEDIA_ALREADY_CONFIRMED` | 400 | Confirm 1 media đã `READY` |
| `MEDIA_UPLOAD_FAILED` | 422 | Lỗi ghi file lên storage (Cách A) |
| `MEDIA_NOT_FOUND` | 404 / 400 | `404` khi `GET`/`DELETE` media không tồn tại/không sở hữu. `400` khi gửi tin với `attachmentIds` chứa media không hợp lệ / chưa `READY` / không sở hữu |

Đầy đủ error code → [12-error-codes.md](./12-error-codes.md).

---

**Liên quan:**
- 💬 Gửi tin nhắn (gắn media qua `attachmentIds` + `type`) → [04-messages.md](./04-messages.md)
- 📦 Response envelope → [02-response-envelope.md](./02-response-envelope.md)
- 🔁 Retry an toàn → [10-idempotency.md](./10-idempotency.md)
