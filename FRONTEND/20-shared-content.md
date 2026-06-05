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

## 4. FE lấy hết một lần — "Xem thêm" mở rộng phía FE

> Quyết định: FE gọi **1 lần KHÔNG `limit`** (lấy đủ toàn bộ), rồi **"Xem thêm" chỉ mở rộng
> số item hiển thị bằng slicing phía FE** — không gọi BE thêm. Vừa né được bug phân trang BE
> (§7), vừa tránh render hàng loạt thumbnail media cùng lúc (chỉ render `EXPAND_STEP` item đầu).

- `useQuery` per-type, `chatApi.listShared(cid, { type })` (không `limit`) → `Message[]` đầy đủ.
- UI: `useExpandable` giữ `visible = items.slice(0, count)`; nút **"Xem thêm"** tăng `count`
  thêm `EXPAND_STEP` (12) — thuần client, 0 request.

### Gợi ý FE (lấy hết + expand client-side)

```ts
const q = useQuery({
  queryKey: chatKeys.shared(conversationId, type),
  queryFn: () => chatApi.listShared(conversationId, { type }),   // không limit = lấy hết
  enabled: featureFlags.sharedContentApi && !!conversationId,
  staleTime: 60_000,
});
const all = q.data?.items ?? [];               // Message[] đầy đủ
const visible = all.slice(0, count);           // "Xem thêm" → count += EXPAND_STEP
```

---

## 5. Tiêu chí nghiệm thu

- [x] `GET /conversations/:id/shared?type=MEDIA` (không `limit`) trả **toàn bộ** ảnh/video
      của hội thoại trong 1 lần gọi, mới → cũ.
- [x] `type=FILE` trả file/audio; `type=LINK` trả message TEXT chứa URL (BE đã lọc sẵn).
- [x] Mỗi item MEDIA/FILE có `attachments[].downloadUrl` ký sẵn (+`expiresIn`) dùng được ngay.
- [ ] **(BUG còn mở — xem §7, FE không dùng nên không chặn)** Khi truyền `limit`: mỗi trang
      trả **đủ tới `limit` item ĐÃ lọc** (không trả trang rỗng kèm `nextCursor`).
- [x] Message đã thu hồi (`isDeleted`) không xuất hiện.
- [x] Chỉ member truy được; người ngoài → `404` (giấu tồn tại).

---

## 7. ⚠️ BUG đang mở — phân trang lọc-SAU-khi-limit (BE cần sửa)

**Triệu chứng:** `?type=LINK` (không `limit`) ra link, nhưng `?type=LINK&limit=12` trả
`data: []` kèm `meta.nextCursor` khác null.

```http
GET …/shared?type=LINK            → data: [ <message có link> ]        ✅
GET …/shared?type=LINK&limit=12   → data: [], meta.nextCursor: "..."   ❌ (rỗng nhưng còn cursor)
```

**Nguyên nhân:** BE lấy `limit` tin **trước**, rồi **lọc theo loại sau** (decrypt → check link /
check attachment). Nếu trong `limit` tin gần nhất không có tin khớp loại → trang đó rỗng dù
vẫn còn item ở trang cũ hơn. Ảnh hưởng **cả MEDIA/FILE/LINK** (MEDIA chỉ tình cờ thoát vì
tin media nằm trong cửa sổ gần nhất).

**Yêu cầu sửa (BE):** phân trang trên **tập đã lọc**, mỗi trang trả đủ tới `limit` item thật:
- Cách A: lọc ngay ở tầng query/DB (vd cột đánh dấu `hasLink`/`hasAttachment` khi ghi tin,
  hoặc điều kiện `type IN (...)` cho MEDIA/FILE) rồi mới `LIMIT`.
- Cách B (nếu buộc lọc sau decrypt): lặp lấy thêm cho tới khi gom đủ `limit` item khớp loại
  hoặc hết dữ liệu; **không** trả trang rỗng khi vẫn còn `nextCursor`.
- Nghiệm thu: `?type=LINK&limit=12` phải trả ngay các tin chứa link (≤12), `nextCursor` chỉ
  khác null khi **thực sự** còn link ở trang sau.

**FE hiện tránh bug bằng cách KHÔNG truyền `limit`** (gọi 1 lần lấy hết — đường này BE lọc
đúng trên toàn lịch sử, xem §4). Vì vậy bug này **không chặn FE**. Vẫn nên sửa BE để nếu sau
này cần phân trang server-side (hội thoại cực lớn) thì dùng được.

---

## 6. Phần FE (đã wiring xong ✅)

Endpoint đã ship → FE bật flag, gọi "lấy hết" + mở rộng client-side:

- `chatApi.listShared(conversationId, { type, limit?, before? })` → `src/services/chat.api.ts`
  — FE gọi không kèm `limit`; `undefined` query bị client tự bỏ.
- `chatKeys.shared(conversationId, type)` → `src/services/keys.ts`
- `useSharedMessages(conversationId, type, enabled)` — **`useQuery`** (1 lần, không `limit`),
  `staleTime: 60s` → `features/chat/hooks/use-query.ts`
- `useSharedContent` trả mỗi tab `SharedSection = { items, isLoading }` (items đầy đủ);
  gọi 3 query (MEDIA/FILE/LINK) khi flag bật, **fallback** suy ra từ cache message khi tắt →
  `features/chat/hooks/useSharedContent.ts`.
- `SharedTabs`: `useExpandable` cắt hiển thị theo `EXPAND_STEP (12)`, nút **"Xem thêm"** mở
  rộng phía FE (0 request).
- Flag `featureFlags.sharedContentApi = true` (`src/config/features.ts`).

> Muốn tắt nhanh (vd endpoint lỗi) → set flag về `false`, FE tự fallback về cache derivation.
