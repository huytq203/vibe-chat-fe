# 02 — Component Rules

## Phân định Server vs Client
- **Default = Server Component.** Fetch data, đọc DB/file ở đây, truyền xuống Client qua props (đã serialize — KHÔNG truyền function/class instance).
- `'use client'` **chỉ khi** cần state/effect/event handler/browser API. Đặt ở **component lá nhỏ nhất**.
- KHÔNG đặt `'use client'` ở `layout.tsx`/`page.tsx` top-level.
- Tránh `typeof window !== 'undefined'` để render khác nhau lúc đầu → gây Hydration Mismatch. Cần browser API → `useEffect` hoặc `dynamic(..., { ssr: false })`.

## Cấu trúc & giới hạn
- Component **< 200 dòng**. Quá → tách component con hoặc đẩy logic sang hook (`< 80 dòng`).
- Function **< 50 dòng**. File **< 300 dòng**.
- **Named export** bắt buộc (trừ Page/Layout của Next phải default export).
- `interface XxxProps` đặt ngay trên component.

## Bắt buộc
- **4 trạng thái** cho UI có data API: loading / error / empty / data → [../patterns/four-states.md](../patterns/four-states.md).
- **Early return** cho điều kiện lỗi/phủ định trước, tránh lồng sâu.
- UI primitives lấy từ **Basuicn** (`@/components/ui/*`). Không tự viết Button/Input/Dialog/Select.
- Component thuộc đúng 1 route → để trong `app/.../_components/`.
- Component của feature → `features/<x>/components/`. Dùng ≥ 2 feature → promote lên `components/common/`.

## A11y
- HTML ngữ nghĩa (semantic). `aria-label` khi cần. Hỗ trợ điều hướng bàn phím. Focus state rõ ràng.

## Cấm
- Inline arrow trong render của component đã `memo` (phá memo).
- Prop drilling > 2 cấp → lift state / context.
- `dangerouslySetInnerHTML` (trừ khi sanitize bằng `dompurify` + comment).
