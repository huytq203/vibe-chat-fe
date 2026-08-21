# Design — Gộp Emoji / GIF / Sticker vào một Media Picker

> Ngày: 2026-08-21 · Phạm vi: `src/features/chat/components/messages/*`, `src/app/api/giphy/*`, `src/services/*`
> Trạng thái: đã duyệt design, chờ implementation plan.

---

## 1. Bối cảnh & vấn đề

Thanh soạn tin (`MessageInput` → `ComposerActions`) đang phơi ra quá nhiều điểm vào rời rạc:

- `ComposerActions.tsx` dài **345 dòng** — vượt giới hạn 200 dòng của rule §0.2.
- Ba entry point độc lập cho cùng một nhóm hành vi "chèn nội dung vui":
  1. Popover Emoji (`EmojiPicker`) — chỉ hiện trên desktop.
  2. Popover Sticker (`StickerPicker`) — chỉ hiện trên desktop.
  3. Menu `MoreHorizontal` với state `moreView: 'actions' | 'emoji' | 'sticker'` — nhánh mobile **lặp lại** toàn bộ hai picker trên kèm header "Quay lại" tự viết tay.
- Hệ quả: cùng một `EmojiPicker` được render ở 2 nơi với 2 cách đóng khác nhau; thêm một loại nội dung mới (GIF) sẽ nhân đôi chi phí một lần nữa.
- Chưa có GIF. `MessageType` không có `'GIF'`.

## 2. Mục tiêu

1. **Một** nút duy nhất trên thanh soạn mở **một** picker chứa Emoji / GIF / Sticker, dùng chung code cho desktop và mobile.
2. Thêm GIF từ Giphy, **không thay đổi backend**.
3. `ComposerActions.tsx` về dưới 200 dòng.

### Ngoài phạm vi

- Không đụng `AttachmentButtons` (ảnh/video/tệp) — giữ nguyên vị trí hiện tại.
- Không đụng hệ sticker nội bộ (`stickers.api.ts`, `use-stickers.ts`, packs, `StickersTab`).
- Không thêm tab Giphy Stickers (chỉ `/v1/gifs`).
- Không đụng render bong bóng tin nhắn (`MediaContent`, `BubbleContent`).

---

## 3. Quyết định kiến trúc

### 3.1 Gửi GIF = tải bytes rồi upload như ảnh thường

**Ràng buộc từ backend** (`FRONTEND/04-messages.md`, `FRONTEND/14-media-upload.md`):

- `MessageType` không có `GIF`; thêm là việc của backend.
- `type: IMAGE` **bắt buộc** `attachmentIds` (≥1) — thiếu → `400 MESSAGE_ATTACHMENT_REQUIRED`. Không có đường gửi URL ảnh trần.
- `category: ATTACHMENT` validate **theo đuôi file**, whitelist có `gif`, tối đa **50 MB**.
- `MediaContent.tsx:202` render bằng `<img>` thuần (không `next/image`) → GIF tự chạy animation, không cần sửa gì.

**Luồng chốt:**

```
click GIF trong picker
  → GET /api/giphy/asset?id=<giphy-id>      (proxy tải bytes)
  → new File([blob], `giphy-${id}.gif`, { type: 'image/gif' })
  → mediaApi.uploadDirect(file, 'ATTACHMENT')
  → send({ conversationId, type: 'IMAGE', attachmentIds: [media.id], clientNonce })
```

**Phương án đã loại:** gửi `metadata.gifUrl` trỏ thẳng CDN Giphy. Cần backend nới validate, cần sửa `BubbleContent`/`MediaContent` để render nhánh mới, và tin nhắn cũ sẽ vỡ nếu Giphy gỡ asset. Không đáng.

### 3.2 Giphy key nằm sau Next route handler

`GIPHY_API_KEY` là **server-only**, không `NEXT_PUBLIC_`. Client chỉ gọi same-origin `/api/giphy`. Lợi ích ngoài việc giấu key: rate-limit được, đổi payload trả về gọn hơn, và né CORS khi tải bytes GIF.

`/api/giphy` không đụng rewrite nào trong `next.config.ts` (các rewrite đều là `/api/v1/*`, `/api/docs/*`, `/task-proxy/*`).

**Electron:** `electron/main.js:81` spawn Next standalone server thật rồi `loadURL('http://127.0.0.1:PORT')` → route handler hoạt động bình thường trên desktop app. (Nếu sau này chuyển sang `output: 'export'` thì route handler sẽ chết — ghi chú trong code.)

### 3.3 Popover (desktop) + Drawer (mobile), một panel dùng chung

Desktop giữ popover neo vào nút như hiện tại — không overlay che khung chat. Mobile dùng `Drawer` bottom sheet thay cho nhánh `moreView` lồng nhau. Nội dung bên trong là **cùng một component**, chỉ khác vỏ.

---

## 4. Thiết kế chi tiết

### 4.1 `src/app/api/giphy/` — proxy

#### `giphy-env.ts` (module dùng chung, server-only)

```ts
const schema = z.object({ GIPHY_API_KEY: z.string().min(1) });
```

Parse lazy khi route được gọi lần đầu (không throw lúc build). Thiếu key → route trả `503 { error: { code: 'GIPHY_NOT_CONFIGURED' } }`, picker hiển thị empty-state "Chưa cấu hình GIF" thay vì crash.

#### `route.ts` — tìm kiếm / trending

```
GET /api/giphy?kind=trending&offset=0
GET /api/giphy?kind=search&q=mèo&offset=24
```

- Query Zod: `kind: 'trending' | 'search'`, `q: string.max(100)` (bắt buộc khi `kind=search`), `offset: coerce.number().int().min(0).max(4990)`.
- `limit` **cố định 24 phía server** — client không được tự chọn.
- Gọi `https://api.giphy.com/v1/{gifs}/{trending|search}` với `api_key`, `rating=g`, `lang=vi`, `bundle=messaging_non_clips`.
- **Map về payload gọn**, không trả raw Giphy:

```ts
type GiphyItem = {
  id: string;
  title: string;
  previewUrl: string;   // images.fixed_width_small.webp — nhẹ cho grid
  previewWidth: number;
  previewHeight: number;
};
```

`sendUrl` **không** trả về client — client chỉ cầm `id`, URL thật do proxy tự resolve khi gửi (xem 4.1 `asset`). Đây là điều kiện để chặn SSRF.

- Response: `{ items: GiphyItem[], nextOffset: number | null }`.
- Cache: `Cache-Control: public, max-age=300` cho `trending`, `max-age=60` cho `search`.

#### `asset/route.ts` — tải bytes GIF

```
GET /api/giphy/asset?id=<giphy-id>
```

- Zod: `id: z.string().regex(/^[A-Za-z0-9]+$/).max(64)` — **chỉ nhận id, không nhận URL**. Đây là biện pháp chặn SSRF: không có cách nào ép proxy gọi host tuỳ ý.
- Server gọi `GET https://api.giphy.com/v1/gifs/{id}` → lấy `images.downsized_medium.url` (≤5 MB; fallback `images.downsized.url` → `images.original.url`).
- `fetch` URL đó, kiểm tra `content-type` bắt đầu bằng `image/`, `content-length` ≤ 8 MB → stream `response.body` về client kèm `Content-Type: image/gif`.
- Chi phí: thêm 1 round-trip Giphy **mỗi lần gửi** (không phải mỗi lần tìm kiếm). Chấp nhận được — send hiếm hơn search rất nhiều.

#### `src/lib/rate-limit/memory.ts` (mới)

Rule 05 §9 bắt route public phải rate-limit; `src/lib/rate-limit` chưa tồn tại.

- Sliding window in-memory: `Map<string, number[]>`, key = IP (`x-forwarded-for` đầu tiên, fallback `x-real-ip`).
- Mặc định 60 req/phút cho `/api/giphy`, 30 req/phút cho `/api/giphy/asset`.
- Dọn entry hết hạn khi ghi (không cần timer nền).
- Vượt hạn → `429 { error: { code: 'RATE_LIMITED' } }`.
- Ghi chú rõ trong file: chỉ đúng khi chạy **một** instance; scale ngang thì thay bằng Redis.

### 4.2 Data layer

| File | Nội dung |
|---|---|
| `src/features/chat/types/gif.ts` (mới) | `giphyItemSchema` (Zod) → `export type GiphyItem = z.infer<...>`; `giphyPageSchema`. Zod là nguồn sự thật type (rule 01). |
| `src/services/giphy.api.ts` (mới) | Transport thuần: `fetch('/api/giphy?...')` same-origin, **không** qua `apiClient` (không cần JWT của vibe backend), parse bằng `giphyPageSchema.parse`, ném `Error` có `code` khi envelope lỗi. |
| `src/services/keys.ts` (sửa) | Thêm `giphyKeys = { all, trending(), search(q) }`. |
| `src/features/chat/hooks/use-giphy.ts` (mới) | `useGiphyGifs(query: string)` — `useInfiniteQuery`, `getNextPageParam: (last) => last.nextOffset`, `staleTime: 5 * 60_000`, `enabled` luôn true (rỗng → trending). Debounce query 350ms **ở component** (`GifPicker`), hook nhận query đã debounce. |
| | `useSendGif(conversationId)` — `useMutation<void, Error, GiphyItem>`: `fetch('/api/giphy/asset?id=')` → `blob()` → `new File(...)` → `mediaApi.uploadDirect(file, 'ATTACHMENT')` → `useSendMessage().mutateAsync({ type: 'IMAGE', attachmentIds, clientNonce, replyToMessageId })`. Lỗi → `toast.error`. |

`useSendGif` phải nhận `replyToMessageId` từ store reply giống `useMessageComposer` để GIF trả lời được tin nhắn — lấy qua `useMessageReplyStore` và `cancelReply()` sau khi gửi.

### 4.3 UI — `src/features/chat/components/messages/media-picker/`

| File | Vai trò | Ước lượng |
|---|---|---|
| `MediaPickerTrigger.tsx` | Nút 😊 duy nhất. `useIsMobile()` → `Drawer` hoặc `Popover`. Tự giữ `open`. Prefetch chunk emoji khi hover/focus (`prefetchEmojiPicker`). | ~90 dòng |
| `MediaPickerPanel.tsx` | `Tabs` (Emoji / GIF / Sticker) + footer attribution. Nhận `onEmojiSelect`, `onPickSticker`, `onPickGif`, `onClose`. | ~90 dòng |
| `GifPicker.tsx` | Ô tìm kiếm + grid + infinite scroll + 4 trạng thái. | ~130 dòng |
| `use-picker-tab.ts` | Nhớ tab cuối qua `lib/storage/local-storage` (key `chat.media-picker.tab`), validate giá trị đọc ra. | ~25 dòng |

**Kích thước panel:** desktop `w-[352px] h-[420px]` (khớp `EmojiPicker` 350×400 hiện có, cộng thanh tab). Mobile: full-width drawer, cao `70dvh`.

**Grid GIF:** 2 cột (mobile) / 3 cột (desktop), `column-count` CSS để giữ tỉ lệ ảnh không đều, mỗi ô là `<button>` bọc `<img loading="lazy">` với `aspect-ratio` từ `previewWidth/previewHeight` → không layout shift.

**Attribution:** Giphy TOS yêu cầu hiển thị "Powered by GIPHY" trong giao diện dùng API — footer nhỏ dưới tab GIF.

**Trạng thái gửi:** `useSendGif` không dựng optimistic attachment (khác `useMessageComposer.submit`, vốn có blob cục bộ để preview ngay). Nếu đóng panel ngay khi bấm thì người dùng không thấy phản hồi nào trong 1–2 s. Vì vậy: **giữ panel mở**, ô GIF vừa bấm hiện overlay spinner và bị `disabled`, các ô khác cũng `disabled` trong lúc gửi; panel đóng ở `onSuccess`. Lỗi → panel vẫn mở, hiện `toast.error`, bỏ spinner.

### 4.4 Dọn dẹp `ComposerActions` và `useMessageComposer`

**`ComposerActions.tsx`** (345 → ~150 dòng):

- Xoá `Popover` Emoji, `Popover` Sticker, hai nhánh `moreView === 'emoji' | 'sticker'`, hai `ActionItem` Emoji/Sticker trong menu mobile, state `moreView`, `stickerOpen`, import `EmojiPicker`/`StickerPicker`/`useSendSticker`/`ArrowLeft`/`Sticker`/`Smile`.
- Thêm `<MediaPickerTrigger conversationId={...} disabled={...} onEmojiSelect={...} />` hiển thị ở **cả** desktop và mobile (không còn `!isMobile`).
- `moreOpen` giữ nguyên cho các action còn lại (WebApp, AI, Bình chọn, Danh thiếp, Mở rộng, Hẹn giờ, Tự huỷ) + `AttachmentButtons` ở nhánh mobile.

**Props bỏ đi:** `emojiOpen`, `onEmojiOpenChange`, `onEmojiButtonClick` — picker tự quản lý state mở.

**`useMessageComposer.ts`:** bỏ `emojiOpen`, `setEmojiOpen`, `handleEmojiButtonClick` khỏi state và return. Giữ `handleEmojiSelect` (vẫn `insertText` vào editor), bỏ dòng `setEmojiOpen(false)` bên trong.

**`MessageInput.tsx`:** bỏ 3 prop trên khỏi `<ComposerActions>` và khỏi destructure hook.

---

## 5. Bốn trạng thái (rule §0.3)

`GifPicker` là UI duy nhất lấy data mới từ API:

| Trạng thái | Hiển thị |
|---|---|
| loading | Grid 9 khối skeleton `animate-pulse` đúng kích thước ô, giữ nguyên chiều cao panel. |
| error | Icon + "Không tải được GIF" + nút "Thử lại" gọi `refetch()`. Riêng code `GIPHY_NOT_CONFIGURED` → "Tính năng GIF chưa được cấu hình" **không** có nút thử lại. |
| empty | `q` rỗng mà trending rỗng → "Chưa có GIF nào". Có `q` → "Không tìm thấy GIF cho \"<q>\"". |
| data | Grid + sentinel `IntersectionObserver` để `fetchNextPage`, spinner nhỏ dưới đáy khi `isFetchingNextPage`. |

Tab Sticker giữ nguyên `StickerPicker` hiện có (đã có loading + empty; **không** mở rộng phạm vi sang việc bổ sung error state cho nó ở lần này).

## 6. A11y

- Nút trigger: `aria-label="Emoji, GIF và sticker"`.
- `Tabs` của Base UI đã có `role="tablist"` + điều hướng mũi tên.
- Mỗi ô GIF là `<button>` với `aria-label={title || 'GIF'}`.
- Ô tìm kiếm có `<label>` ẩn (`sr-only`).
- Đóng bằng `Esc` (Popover/Drawer lo sẵn); focus trả về nút trigger.

## 7. Bảo mật

| Rủi ro | Xử lý |
|---|---|
| Lộ API key | Key server-only, client chỉ thấy `/api/giphy`. |
| SSRF qua proxy tải bytes | Endpoint chỉ nhận `id` khớp `^[A-Za-z0-9]+$`; URL do server tự resolve từ Giphy API. |
| Lạm dụng quota Giphy | Rate-limit theo IP ở cả hai route. |
| Nội dung người lớn | `rating=g` ở mọi request. |
| Proxy thành open file-relay | Chặn `content-type` không phải `image/*` và `content-length` > 8 MB. |
| Input người dùng | Toàn bộ query Zod-validate ở biên route (rule 05 §3). |

## 8. Test (Vitest + Testing Library)

| File | Ca kiểm |
|---|---|
| `GifPicker.test.tsx` (mới) | 4 trạng thái; gõ tìm kiếm có debounce; bấm ô GIF gọi `onPick` đúng item. |
| `MediaPickerPanel.test.tsx` (mới) | Render đủ 3 tab; đổi tab hiện đúng picker; tab được nhớ qua `local-storage` (mock wrapper). |
| `use-giphy.test.ts` (mới) | `useSendGif`: chuỗi asset → `uploadDirect` → `sendMessage` gọi đúng thứ tự, đúng `type: 'IMAGE'` + `attachmentIds`; lỗi tải → `toast.error`, **không** gọi `sendMessage`. |
| `app/api/giphy/route.test.ts` (mới) | Query sai → 400; thiếu key → 503; happy path map đúng shape; vượt rate limit → 429. |
| `ComposerActions.test.tsx` (sửa) | Bỏ assert nút "Emoji"/"Sticker" riêng và nhánh `moreView`; thêm: cả desktop lẫn mobile đều thấy đúng **một** nút mở picker. |

## 9. Danh sách file

**Mới — 12 file nguồn:**
```
src/app/api/giphy/route.ts
src/app/api/giphy/asset/route.ts
src/app/api/giphy/giphy-env.ts
src/lib/rate-limit/memory.ts
src/services/giphy.api.ts
src/features/chat/types/gif.ts
src/features/chat/hooks/use-giphy.ts
src/features/chat/components/messages/media-picker/MediaPickerTrigger.tsx
src/features/chat/components/messages/media-picker/MediaPickerPanel.tsx
src/features/chat/components/messages/media-picker/GifPicker.tsx
src/features/chat/components/messages/media-picker/use-picker-tab.ts
src/features/chat/components/messages/media-picker/index.ts
```

**Mới — 4 file test:**
```
src/app/api/giphy/route.test.ts
src/features/chat/hooks/use-giphy.test.ts
src/features/chat/components/messages/media-picker/GifPicker.test.tsx
src/features/chat/components/messages/media-picker/MediaPickerPanel.test.tsx
```

**Sửa — 6 file:**
```
src/services/keys.ts                                        (+ giphyKeys)
src/features/chat/types/index.ts                            (export type GiphyItem)
src/features/chat/hooks/useMessageComposer.ts               (bỏ emojiOpen)
src/features/chat/components/messages/ComposerActions.tsx   (345 → ~150 dòng)
src/features/chat/components/messages/ComposerActions.test.tsx
src/features/chat/components/messages/MessageInput.tsx      (bỏ 3 prop)
```

**Tổng: 22 file** (12 nguồn mới + 4 test mới + 6 sửa).

**Env cần thêm:** `GIPHY_API_KEY` — thêm vào `.env.local` (chạy local) và khai báo trong `.env.example` ở khối "Server-side", kèm ghi chú lấy key tại `developers.giphy.com`.

## 10. Rủi ro & đánh đổi

- **Không dùng `@giphy/js-fetch-api`.** Thêm lib ngoài bảng §2 tech stack là vi phạm rule; tự `fetch` + Zod là đủ và ít phụ thuộc hơn.
- **Gửi GIF chậm hơn sticker ~1–2 s** (resolve URL + tải + upload). Giảm đau bằng spinner trên ô và chọn `downsized_medium` thay `original`.
- **Rate-limit in-memory chỉ đúng với 1 instance.** Ghi chú trong code; đổi sang Redis khi scale.
- **Đụng `src/app/api/`** — đã được người dùng duyệt riêng (rule §7).
- **22 file** vượt ngưỡng 5 file của rule §7 — đã được người dùng duyệt design này.
