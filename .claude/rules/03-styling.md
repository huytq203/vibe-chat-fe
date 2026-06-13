# 03 — Styling (Tailwind v4 + Basuicn)

> Token màu/font/radius/spacing: **bám sát `Design/DESIGN.md`** (Kraken-inspired). Không tự chế token.

## Công cụ
- **Tailwind CSS v4** là chính. Entrypoint: `src/styles/globals.css`.
- Biến thể component: `tailwind-variants` (đi kèm Basuicn) hoặc `cva`.
- Gộp class: `cn()` từ `@/lib/utils` (`clsx` + `twMerge`).
- **Không** CSS-in-JS, **không** CSS Modules (trừ khi user yêu cầu), **không** inline `style` (trừ giá trị tính runtime).

## Basuicn
- Cài: `npx basuicn add <name>` → file sinh ra ở `src/components/ui/` (coi như source dự án, **không sửa tay**).
- Cập nhật: `npx basuicn update <name>` rồi review diff. KHÔNG copy-paste từ web.
- Cần ghi đè style nhỏ → tạo **wrapper** trong `components/common/`, không sửa file gốc.
- Customize qua `tailwind-variants` hoặc prop `className` + `cn()`.

## Quy ước
- Mobile-first; breakpoints theo `Design/DESIGN.md §8`.
- Radius button tối đa 12px (không pill cho button). Dùng đúng scale spacing/radius của DESIGN.
- Dark mode (nếu có) qua class strategy + CSS vars, không hardcode 2 bộ màu rời rạc.
- Thứ tự class: layout → spacing → size → màu → typography → state. Giữ nhất quán.

## Cấm
- Hardcode mã màu ngoài bảng DESIGN.
- Magic number spacing không thuộc scale.
- Tự cấu hình Tailwind token lệch với DESIGN.md.
