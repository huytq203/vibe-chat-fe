# STEP — Thêm một component

1. **Phân loại vị trí**:
   - Chỉ dùng trong 1 route → `app/.../_components/`.
   - Của 1 feature → `features/<x>/components/`.
   - Dùng ≥ 2 feature → `components/common/`.
   - Là UI primitive (Button/Input/Dialog…) → **Basuicn**: `npx basuicn add <name>` (báo user chạy), KHÔNG tự viết.
2. **Server hay Client?** Mặc định Server. Cần state/effect/event/browser API → `'use client'` ở chính component này (lá nhỏ nhất). Xem [../rules/02-components.md](../rules/02-components.md).
3. **Props**: `interface XxxProps` ngay trên component. Data từ Server → Client qua props serialize.
4. **Nếu hiển thị data API** → đủ **4 trạng thái** ([../patterns/four-states.md](../patterns/four-states.md)). Lấy data qua hook Query, KHÔNG `useEffect+fetch`.
5. **Style**: Tailwind v4 + `cn()`, token theo [../Design/DESIGN.md](../Design/DESIGN.md). Không inline style.
6. **Giới hạn**: < 200 dòng. Quá → tách con hoặc đẩy logic sang hook (< 80 dòng).
7. **A11y**: semantic tag, `aria-label`, keyboard nav, focus rõ.
8. **Test**: 1 happy path + 1 edge case (Testing Library — test behavior, không test state nội bộ).
9. **Mẫu**: [../templates/component.md](../templates/component.md).
