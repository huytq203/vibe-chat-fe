# STEP — Sửa bug an toàn

1. **Tái hiện** — xác định bước reproduce + hành vi mong đợi vs thực tế. Không reproduce được → hỏi user thêm context.
2. **Khoanh vùng** — đọc file liên quan trong `src/` trước khi sửa (đọc, không đoán). Tìm root cause, không vá triệu chứng.
3. **Đánh giá ảnh hưởng** — thay đổi chạm > 5 file hoặc rename module → DỪNG, hỏi user.
4. **Viết test tái hiện bug TRƯỚC** (red) → sửa code → test pass (green). Tránh regression.
5. **Sửa tối thiểu, đúng tầng** — lỗi data → tầng service/hook; lỗi UI → component; lỗi type → schema/types. Tôn trọng kiến trúc, không phá rule để vá nhanh.
6. **Kiểm tra phụ cận** — 4 trạng thái UI còn đúng? Query key/invalidate còn đúng? Hydration ổn?
7. **Verify** — `tsc --noEmit` + `npm run lint` + test liên quan pass.
8. **Báo cáo** (tiếng Việt, ≤ 5 dòng): nguyên nhân gốc, cách sửa, vì sao an toàn.

## Tuyệt đối tránh
- Bọc `try/catch` nuốt lỗi cho "hết đỏ".
- Thêm `any`/`@ts-ignore`/`eslint-disable` để qua lỗi.
- Sửa file `components/ui/` (Basuicn) thay vì wrapper.
