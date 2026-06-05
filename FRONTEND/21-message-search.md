# 21 — Message Search (Tìm tin nhắn trong hội thoại)

> **Mục tiêu:** ô tìm kiếm trong 1 conversation (group hoặc direct) tìm được tin nhắn
> theo từ khoá trên **toàn bộ lịch sử**, không phụ thuộc phần message client đã nạp.

Endpoint require JWT. AuthZ: chỉ **member** của conversation. Liên quan:
[04-messages.md](./04-messages.md) (shape `Message`), [20-shared-content.md](./20-shared-content.md)
(cùng pattern cursor + shape Message).

---

## 1. Endpoint (đã ship ✅)

```http
GET /api/v1/conversations/{conversationId}/messages/search?key=hợp đồng&limit=20
Authorization: Bearer <accessToken>
```

| Query param | Bắt buộc | Mô tả |
|---|---|---|
| `key` | ✅ | Từ khoá tìm kiếm (1–100 ký tự, BE tự `trim`). |
| `limit` | — | Số kết quả mỗi trang. Mặc định `20`, tối đa `100`. |
| `before` | — | Cursor (ISO date) — lấy trang cũ hơn (`createdAt < before`). |
| `senderId` | — | Lọc theo **người gửi** (`keycloakId`). Chủ yếu cho **group**. Bỏ trống = mọi người. |
| `from` | — | Lọc **thời gian**: chỉ tin `createdAt >= from` (ISO date). |
| `to` | — | Lọc **thời gian**: chỉ tin `createdAt <= to` (ISO date). |

> Các filter **kết hợp được** (AND): vd `?key=báo cáo&senderId=<uid>&from=2026-06-01&to=2026-06-30`
> = tìm "báo cáo" do user đó gửi trong tháng 6. `from`/`to`/`senderId` đều **độc lập**,
> truyền cái nào áp cái đó.

### Response — **đồng shape với `GET /messages`**

Trả `Message[]` (full shape như [04-messages.md](./04-messages.md)) đã khớp từ khoá,
sắp xếp **mới → cũ** (`createdAt DESC`), kèm `meta.nextCursor` để phân trang tiếp.

```json
{
  "success": true,
  "data": [ /* Message[] — đầy đủ attachments[] + downloadUrl ký sẵn + expiresIn */ ],
  "meta": { "limit": 20, "nextCursor": "2026-06-01T08:30:00.000Z" }
}
```

- `meta.nextCursor = null` → đã hết kết quả.
- Còn kết quả → gọi tiếp với `before=<meta.nextCursor>`.

> Dùng lại nguyên shape `Message` để FE tái dụng toàn bộ logic hiển thị (highlight từ
> khoá trong `plaintext`, render attachment, jump-to-message…). **Không** cần DTO riêng.

---

## 2. Phạm vi khớp & giới hạn ⚠️ (đọc kỹ)

Để search **nhanh** mà không phải giải mã toàn bộ lịch sử, BE khớp trên bản xem trước
(`contentPreview`) — vốn được lưu **không mã hoá** cho mỗi tin. Hệ quả:

| Đặc điểm | Hành vi hiện tại |
|---|---|
| Loại tin khớp | **Chỉ tin TEXT.** Caption của ảnh/video/file **không** tìm được (bị mã hoá). |
| Độ dài khớp | Chỉ **150 ký tự đầu** của tin. Từ khoá nằm sau ký tự 150 không khớp. |
| Hoa/thường | Không phân biệt (case-insensitive). |
| Dấu tiếng Việt | **Phân biệt dấu** — tìm `"hop dong"` **không** ra `"hợp đồng"`. |
| Tin đã thu hồi | Không xuất hiện (`isDeleted`). |

> FE nên hiển thị placeholder dạng "Tìm trong tin nhắn văn bản" và **không** quảng cáo
> là tìm được trong ảnh/file. Nếu sau này cần full-text (bỏ dấu, caption media, toàn bộ
> nội dung) → BE phải dựng search index riêng (Elasticsearch) — là thay đổi lớn, sẽ có doc mới.

---

## 3. Lọc nâng cao (sender + thời gian)

Ngoài từ khoá, có thể thu hẹp kết quả — tất cả **kết hợp AND** với `key`:

- **Theo người gửi (group):** `?senderId=<keycloakId>`. Lấy danh sách member để render
  dropdown "Người gửi" (xem [16-group-members.md](./16-group-members.md)). Direct cũng dùng
  được nhưng ít ý nghĩa (chỉ 2 người).
- **Theo thời gian:** `?from=<ISO>&to=<ISO>`. Dùng cho UI "Trong khoảng ngày". Truyền 1 đầu
  cũng được (`from` không `to` = từ ngày X trở đi).

```http
GET …/messages/search?key=báo cáo&senderId=de69744c-…&from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z
```

---

## 4. Phân trang

- Cursor-based, **giống `GET /messages`** và `GET /shared`: `before=<meta.nextCursor>`
  lấy trang cũ hơn; dừng khi `nextCursor = null`.
- **Lưu ý:** giữ nguyên `key`/`senderId`/`from`/`to` khi gọi trang kế — cursor chỉ thay `before`.
- FE dùng `useInfiniteQuery` theo `(conversationId, key, senderId, from, to)`.

### Gợi ý FE

```ts
// chatApi
searchMessages(conversationId, { key, limit = 20, before, senderId, from, to }) =>
  GET /conversations/${conversationId}/messages/search
      ?key=${encodeURIComponent(key)}&limit=${limit}
      ${before ? `&before=${before}` : ''}
      ${senderId ? `&senderId=${senderId}` : ''}
      ${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}

// queryKey — gồm cả filter để cache đúng
chatKeys.search = (conversationId, { key, senderId, from, to }) =>
  ['chat', conversationId, 'search', key, senderId ?? '', from ?? '', to ?? ''] as const;

// hook (debounce key trước khi gọi để tránh spam request)
const debouncedKey = useDebounce(key, 300);
const filters = { key: debouncedKey, senderId, from, to };
const query = useInfiniteQuery({
  queryKey: chatKeys.search(conversationId, filters),
  enabled: debouncedKey.trim().length >= 1,
  queryFn: ({ pageParam }) =>
    chatApi.searchMessages(conversationId, { ...filters, before: pageParam }),
  initialPageParam: undefined,
  getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
});
const results = query.data?.pages.flatMap((p) => p.data) ?? [];
```

- **Debounce** `key` (~300ms) — mỗi keystroke không nên là 1 request.
- **Highlight:** FE tự bôi đậm `key` trong `message.plaintext` (so khớp không phân biệt
  hoa/thường, lưu ý phân biệt dấu).
- **Jump-to-message:** mỗi kết quả có `message.id` + `createdAt` → điều hướng tới tin trong
  khung chat (load quanh `createdAt` nếu chưa có trong cache).

---

## 5. Lỗi thường gặp

| Tình huống | HTTP | `error.code` |
|---|---|---|
| Thiếu `key` / `key` rỗng | `400` | `VALIDATION_ERROR` |
| `key` > 100 ký tự | `400` | `VALIDATION_ERROR` |
| `from`/`to` không phải ISO date | `400` | `VALIDATION_ERROR` |
| Không phải member / conversation không tồn tại | `404` | (giấu tồn tại) |

---

## 6. Tiêu chí nghiệm thu

- [x] `GET …/messages/search?key=...` trả **toàn bộ** tin TEXT khớp trên cả lịch sử, mới → cũ.
- [x] `senderId` lọc đúng người gửi; `from`/`to` lọc đúng khoảng thời gian; kết hợp AND với `key`.
- [x] Mỗi kết quả là `Message` đầy đủ (FE render/highlight như khung chat).
- [x] `meta.nextCursor` phân trang đúng; `before` lấy trang cũ hơn không trùng/sót.
- [x] Tin đã thu hồi (`isDeleted`) không xuất hiện.
- [x] Ký tự đặc biệt regex trong `key` (vd `.`, `*`, `(`) được xử lý an toàn, không lỗi.
- [x] Chỉ member truy được; người ngoài → `404`.
