# 20 — Shared Content (Ảnh & Video / Tài liệu / Liên kết)

> **Mục tiêu:** tab "Ảnh & Video / Tài liệu / Liên kết" trong panel thông tin hội thoại
> phải lấy **đủ toàn bộ lịch sử**, không phụ thuộc người dùng đã cuộn (lazy-load) tới đâu.

Endpoint require JWT. AuthZ: chỉ **member** của conversation. Liên quan:
[04-messages.md](./04-messages.md) (shape `Message` + `Attachment`), [14-media-upload.md](./14-media-upload.md).

---

## 1. Vấn đề hiện tại (FE)

FE đang suy ra nội dung chia sẻ từ **các trang message đã nạp trong cache** (`GET /messages`
lazy 30 tin/lần). Khởi động chỉ có ~30 tin gần nhất → ảnh/file/link cũ hơn **không hiện**.
Cần endpoint chuyên, **BE filter theo loại trên toàn bộ lịch sử**, phân trang độc lập với khung chat.

---

## 2. Endpoint (đã ship ✅)

```http
GET /api/v1/conversations/{conversationId}/shared?type=MEDIA
Authorization: Bearer <accessToken>
```

| Query param | Bắt buộc | Mô tả |
|---|---|---|
| `type` | ✅ | `MEDIA` \| `FILE` \| `LINK` (xem mapping mục 3) |
| `limit` | — | **Bỏ trống = lấy TẤT CẢ** (mặc định, khuyến nghị cho tab Shared). Truyền `1–100` nếu muốn phân trang. |
| `before` | — | Cursor (ISO date) — chỉ dùng khi phân trang: lấy trang cũ hơn (`createdAt < before`). |

> **Mặc định lấy hết:** không truyền `limit` → BE trả **toàn bộ** ảnh/video (hoặc file/link)
> của hội thoại trong **một lần gọi**. Tab Shared **không cần** infinite scroll nữa —
> chỉ cần 1 query là đủ. `limit`/`before` chỉ giữ lại cho trường hợp hội thoại cực lớn
> muốn chia trang chủ động.

### Response — **đồng shape với `GET /messages`**

Trả `Message[]` (full shape như [04-messages.md](./04-messages.md)) đã **lọc sẵn theo `type`**,
sắp xếp **mới → cũ** (`createdAt DESC`).

```json
{
  "success": true,
  "data": [ /* Message[] — đầy đủ attachments[] + downloadUrl ký sẵn + expiresIn */ ],
  "meta": { "limit": null, "nextCursor": null }
}
```

- Khi **lấy all** (không truyền `limit`): `meta.limit = null`, `meta.nextCursor = null`.
- Khi **phân trang** (truyền `limit`): `meta.limit = <limit>`; `meta.nextCursor` = cursor trang
  kế (hoặc `null` khi hết). Gọi tiếp với `before=<nextCursor>`.

> Dùng lại nguyên shape `Message` để FE tái dụng toàn bộ logic hiển thị (attachment,
> `downloadUrl`, refresh URL hết hạn…). FE **không** cần một DTO riêng.

---

## 3. Mapping `type` → message được trả

| `type` | Lọc message | Dùng cho tab |
|---|---|---|
| `MEDIA` | `type IN ('IMAGE','VIDEO')` và có attachment | Ảnh & Video |
| `FILE` | `type IN ('FILE','AUDIO')` và có attachment | Tài liệu |
| `LINK` | `type = 'TEXT'` và `plaintext` chứa ≥1 URL | Liên kết |

- **MEDIA/FILE:** mỗi message trả kèm `attachments[]` (đã có `mediaId`, `fileName`, `fileSize`,
  `mimeType`, `width/height/duration`, `downloadUrl` ký sẵn + `expiresIn`) — y như `GET /messages`.
  BE chỉ trả message **có ≥1 attachment** (tin media-only hợp lệ).
- **LINK:** BE **đã lọc sẵn** — chỉ trả message `TEXT` mà `plaintext` thực sự chứa URL
  (BE decrypt nội dung rồi kiểm tra link). FE chỉ cần trích URL từ `plaintext` để hiển thị.
- **Loại trừ:** message `isDeleted = true` → KHÔNG trả.

> ℹ️ **Lưu ý kỹ thuật:** content tin nhắn vẫn **mã hoá tại DB** (envelope crypto), nên BE
> lọc LINK ở tầng service sau khi decrypt — không phải ở DB. Với `type=LINK` trên hội thoại
> rất nhiều tin text, query này nặng hơn MEDIA/FILE (phải decrypt toàn bộ tin TEXT). Nếu
> thấy chậm, dùng `limit` để phân trang thay vì lấy all.

---

## 4. Phân trang (tuỳ chọn — mặc định KHÔNG cần)

- **Khuyến nghị:** gọi 1 lần không `limit` → nhận hết. Dùng `useQuery` thường (không phải
  `useInfiniteQuery`), data là `Message[]` đầy đủ. Đơn giản nhất cho tab Shared.
- **Khi cần phân trang** (hội thoại quá lớn, hoặc `type=LINK` chậm): truyền `limit` →
  cursor-based **giống `GET /messages`**: `before=<meta.nextCursor>` lấy trang cũ hơn;
  `meta.nextCursor = null` khi hết. Lúc này dùng `useInfiniteQuery` per-type.

### Gợi ý FE (lấy all)

```ts
// chatApi
listShared(conversationId, type) =>
  GET /conversations/${conversationId}/shared?type=${type}   // không kèm limit

// hook
const { data } = useQuery({
  queryKey: chatKeys.shared(conversationId, type),
  queryFn: () => chatApi.listShared(conversationId, type),
  enabled: featureFlags.sharedContentApi && !!conversationId,
  staleTime: 60_000,
});
const messages = data?.data ?? [];   // Message[] — render y như khung chat
```

---

## 5. Tiêu chí nghiệm thu

- [x] `GET /conversations/:id/shared?type=MEDIA` (không `limit`) trả **toàn bộ** ảnh/video
      của hội thoại trong 1 lần gọi, mới → cũ.
- [x] `type=FILE` trả file/audio; `type=LINK` trả message TEXT chứa URL (BE đã lọc sẵn).
- [x] Mỗi item MEDIA/FILE có `attachments[].downloadUrl` ký sẵn (+`expiresIn`) dùng được ngay.
- [x] Khi truyền `limit`: `meta.nextCursor` phân trang đúng; `before` lấy trang cũ hơn không trùng/sót.
- [x] Message đã thu hồi (`isDeleted`) không xuất hiện.
- [x] Chỉ member truy được; người ngoài → `404` (giấu tồn tại).

---

## 6. Phần FE đã chuẩn bị sẵn

Đã viết sẵn, **gate sau feature flag** `featureFlags.sharedContentApi` (mặc định `false`):

- `chatApi.listShared(conversationId, { type, limit?, before? })` → `src/services/chat.api.ts`
  → **bỏ `limit`/`before`** để lấy all (xem §4).
- `chatKeys.shared(conversationId, type)` → `src/services/keys.ts`
- `useSharedContent` đọc endpoint khi flag bật, **fallback** suy ra từ cache khi tắt →
  `features/chat/hooks/useSharedContent.ts`
  → với lấy-all có thể đổi `useSharedMessages` từ `useInfiniteQuery` sang `useQuery` thường.

> Endpoint đã ship đúng contract trên: bật `featureFlags.sharedContentApi = true`
> (`src/config/features.ts`) là tab Shared lấy đủ toàn bộ lịch sử, không phải đổi UI.
