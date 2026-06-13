# STEP — Refactor an toàn

> Mục tiêu: cải thiện cấu trúc **mà không đổi hành vi**. Nếu đổi hành vi → đó là feature/bugfix, không phải refactor.

1. **Chốt phạm vi** — refactor chạm **> 5 file hoặc rename module → DỪNG, hỏi user** trước (theo `CLAUDE.md §7`).
2. **Có lưới an toàn trước** — đảm bảo có test phủ hành vi hiện tại. Thiếu → viết "characterization test" (ghi lại hành vi đang có) TRƯỚC khi đụng code.
3. **Xác định "mùi" code** cần xử lý, ưu tiên:
   - File > 300 dòng / component > 200 / function > 50 → tách.
   - `useEffect+fetch` → chuyển sang TanStack Query (`steps/add-api-query.md`).
   - Fetch rải trong feature → gom về `src/services/*.api.ts`.
   - `features/<x>/api/` → di chuyển sang `services/` + `keys.ts`.
   - Lib bên thứ ba import trực tiếp → bọc vào `src/lib/`.
   - Prop drilling > 2 cấp → lift state / context / store.
   - `any`/`@ts-ignore` → narrow bằng type guard / `z.infer`.
   - Dead code / `_keepAlive` → xoá hẳn.
4. **Đổi từng bước nhỏ, chạy test sau mỗi bước** (commit logic nhỏ). Không "big bang".
5. **Giữ public API ổn định** — `features/<x>/index.ts` export không đổi để không vỡ chỗ dùng. Đổi API → cập nhật mọi nơi import + báo user.
6. **Cập nhật import** sang alias `@/...`, bỏ relative dài.
7. **Verify** — `tsc --noEmit` + `npm run lint` + test pass; so sánh hành vi (UI 4 trạng thái, query/invalidate) trước–sau giống nhau.
8. **Báo cáo** (tiếng Việt, ≤ 5 dòng): đã tách/gom gì, vì sao, xác nhận hành vi không đổi.

## Tuyệt đối tránh
- Refactor kèm đổi hành vi trong cùng lần (khó review, dễ regression).
- Sửa file `components/ui/` (Basuicn) — tạo wrapper thay vì sửa gốc.
- Refactor không có test che lưng.
