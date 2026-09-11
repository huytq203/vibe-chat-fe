# Kế hoạch: mục lục heading cho trang ghi chú

Ngày: 2026-09-10
Repo: `vibe-chat-fe`

## Mục tiêu

Bảng mục lục nổi bên phải trang ghi chú, liệt kê h1–h4 theo cấp. Bấm vào là nhảy thẳng tới
heading đó. Thu gọn thành các gạch nhỏ, rê chuột vào mới mở ra — để trang dài vẫn nắm được
bố cục mà không chiếm chỗ.

## Hiện trạng đã khảo sát (không suy đoán)

- Chưa có mục lục ở cả frontend lẫn notion-service. Làm mới hoàn toàn ở phía client.
- BlockNote render `data-id` trên từng khối — xác nhận trong `node_modules/@blocknote/core/dist`
  và trong fixture sẵn có `NoteEditor.test.tsx:35`: `data-node-type="blockOuter" data-id="block-1"`.
  Đây là điểm neo để cuộn tới.
- Editor tạo trong `NoteEditor.tsx:214` bằng `useCreateBlockNote`.
- `NoteCanvas.tsx` là nơi bố cục trang, `<main>` là vùng cuộn.
- **Thanh tiêu đề vừa được làm `sticky top-0 z-10`** (cùng file, dòng ~96, cao `min-h-14`).

## Quyết định

**D1 — Lấy heading từ `editor.document`, KHÔNG cào DOM.**
Khối heading có `type === 'heading'` và `props.level`. Cào DOM sẽ vỡ mỗi lần BlockNote đổi
cấu trúc render.

**D2 — `NoteEditor` báo ngược lên, `NoteCanvas` dựng giao diện.**
Editor sống trong `NoteEditor`, nhưng mục lục cần đặt ở tầng bố cục. Nên `NoteEditor` nhận
prop `onOutlineChange(headings)` và gọi khi tài liệu đổi; `NoteCanvas` giữ state và render.
Không nhấc editor lên tầng trên chỉ để lấy mục lục.

**D3 — Cuộn tới bằng `scrollIntoView` + `scroll-margin-top`.**
Thanh tiêu đề sticky cao 3.5rem sẽ che mất heading nếu cuộn thẳng lên đầu. Phải đặt
`scroll-margin-top` cho khối đích, KHÔNG tự tính toạ độ bằng tay.

**D4 — Ẩn dưới `md`.** Nhất quán với `FloatingAiButton` trong cùng file. Màn hình hẹp không
đủ chỗ cho mục lục nổi.

**D5 — Không có heading thì không render gì.** Trang trống hoặc chỉ có đoạn văn thì mục lục
là thứ thừa gây nhiễu.

---

## Việc

### 1. `src/features/notes/lib/page-outline.ts` (mới)

Hàm thuần, không React:
```ts
export interface OutlineItem { id: string; text: string; level: number }
export function toOutline(blocks: unknown[]): OutlineItem[]
```
- Chỉ lấy khối `type === 'heading'`, đọc `props.level` (1–4) và ghép text từ `content`.
- Heading rỗng thì BỎ QUA — không tạo mục lục rỗng không bấm được.
- Bám kiểu khối tối thiểu như `page-content-write.service.ts` bên notion-service đang làm,
  đừng phụ thuộc sâu vào generic của BlockNote.

Test: lấy đúng h1–h4 · bỏ qua heading rỗng · bỏ qua khối không phải heading · giữ đúng thứ tự.

### 2. `src/features/notes/components/editor/NoteEditor.tsx`

Thêm prop tuỳ chọn `onOutlineChange?: (items: OutlineItem[]) => void`.
Gọi khi tài liệu đổi (dùng cơ chế theo dõi thay đổi sẵn có của editor — đọc code hiện tại
trước, ĐỪNG thêm `useEffect + polling`).
Không đổi hành vi nào khác của editor.

### 3. `src/features/notes/components/PageOutline.tsx` (mới)

- Cố định bên phải khung soạn thảo, căn giữa theo chiều dọc.
- **Thu gọn**: mỗi mục là một gạch ngang; cấp càng sâu gạch càng ngắn.
- **Rê chuột vào**: mở thành bảng, hiện tiêu đề thụt lề theo cấp.
- **Heading đang xem** nổi bật. Theo dõi bằng `IntersectionObserver`, KHÔNG nghe sự kiện
  `scroll` (nghe scroll gây giật và tốn CPU trên trang dài).
- Bấm → tìm `[data-id="<id>"]` rồi `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- A11y: `<nav aria-label="Mục lục">`, các mục là `<button>` thật, có `aria-current` cho mục
  đang xem, đi được bằng bàn phím.
- Tôn trọng `prefers-reduced-motion`: người dùng tắt hiệu ứng thì cuộn tức thì.

### 4. `NoteCanvas.tsx`

Giữ state outline, truyền `onOutlineChange` xuống `NoteEditor`, render `PageOutline`.
File đang 196 dòng, sát hạn 200 — nếu vượt thì tách, đừng để quá hạn.

### 5. Test

- nên hiện mục lục khi trang có heading
- nên không hiện gì khi trang không có heading
- nên cuộn tới đúng khối khi bấm một mục
- nên đánh dấu mục đang xem khi heading đó vào tầm nhìn
- nên thụt lề theo cấp heading

## Ngoài phạm vi

Kéo thả sắp xếp lại heading từ mục lục. Mục lục cho trang công khai (`PublicPageView`).

## Tiêu chí hoàn thành
`tsc --noEmit` sạch, `eslint src/features/notes` 0 error, toàn bộ test xanh. Không commit.
