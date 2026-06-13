# CONTEXT.md — Bối cảnh & mục tiêu dự án

> Đọc file này đầu tiên để hiểu *vì sao* code được viết như vậy. Quyết định kỹ thuật phải phục vụ mục tiêu dưới đây.

## 1. Sản phẩm

**Halo-chat** — ứng dụng chat (web) thời gian thực. Trọng tâm trải nghiệm:

- Gửi/nhận tin nhắn realtime, mượt, độ trễ thấp.
- Lịch sử hội thoại có phân trang vô hạn (infinite scroll).
- Giao diện sạch, hiện đại theo design system Kraken-inspired (xem `Design/DESIGN.md`).

## 2. Mục tiêu kỹ thuật (theo thứ tự ưu tiên)

1. **Bảo trì được** — module hoá theo feature, file ngắn, tên rõ. Người mới đọc hiểu trong vài phút.
2. **Hiệu năng** — bundle client nhỏ, ưu tiên Server Component, virtualize list dài, tránh re-render thừa.
3. **Type-safe đầu-cuối** — Zod schema chia sẻ client/server, không `any`.
4. **An toàn** — validate ở boundary, không lộ secret, AuthZ trên server.

## 3. Ràng buộc & quyết định đã chốt

- **App Router + Server-First**: mặc định Server Component; chỉ `'use client'` ở component lá.
- **API tập trung**: mọi transport ở `src/services/*.api.ts`, key ở `src/services/keys.ts`. Không rải fetch trong feature.
- **Realtime**: qua wrapper `src/lib/ws/` (socket.io / WebSocket) — feature không gọi socket trực tiếp.
- **UI**: Basuicn là nguồn component chuẩn; chỉ tạo wrapper trong `components/common/` khi cần ghi đè.
- **Chỉ làm việc trong `src/`, `public/`, `.claude/`** — ra ngoài phải hỏi user.

## 4. Không thuộc phạm vi (tránh over-engineer)

- Không build abstraction cho tính năng "tương lai giả định".
- Không thêm state global cho thứ chỉ 1 nhánh component dùng.
- Không tự thêm lib ngoài stack đã chốt (xem `CLAUDE.md §2`).

## 5. Định nghĩa "Done"

Một thay đổi hoàn tất khi: pass `tsc --noEmit` + `npm run lint`, có test cho logic mới, đủ 4 trạng thái UI, tuân checklist `rules/RULE.md §13`, và tôn trọng `Design/DESIGN.md`.
