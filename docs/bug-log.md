# Nhật ký bug (test tay)

Người báo: user (chụp màn hình + mô tả) · Người xử lý: Claude (lên plan, review) + Codex (sửa code).
Trạng thái: 🆕 Mới · 🔍 Đang điều tra · 🛠️ Đang sửa · ✅ Đã sửa (chờ user xác nhận) · ✔️ User đã xác nhận · ⏸️ Hoãn

| # | Ngày | Khu vực | Mô tả | Nguyên nhân | Trạng thái | Commit |
|---|---|---|---|---|---|---|
| B1 | 2026-09-23 | Chat — cảm xúc | Emoji thả cảm xúc hiện icon ảnh vỡ | CDN `jsdelivr/gh/noto-emoji@main` trả 404 | ✅ | FE `8077c66` |
| B2 | 2026-09-23 | Chat — chọn nhiều tin | Dấu tick chọn đè lên chữ đầu tin nhắn | Tick đặt `absolute` trong bubble không chừa chỗ | ✅ | FE `8077c66` |
| B3 | 2026-09-23 | Chat → task (gợi ý AI) | Task tạo từ gợi ý AI mất mô tả | Hook `useConfirmCreateTask` bỏ field `description` | ✅ | FE `675e3b6` |
| B4 | 2026-09-23 | Gợi ý AI | Mô tả là lời khuyên cho PM; hạn chót nhét vào tiêu đề; AI khuyên cập nhật task có sẵn nhưng chỉ có nút tạo mới | Schema gợi ý dùng chung 1 field, thiếu `dueDate`, thiếu hành động cập nhật | ✅ | ai-service `f3aee0e`, task-service `6d5fd15`, FE `675e3b6` |
| B5 | 2026-09-23 | Commitment Graph — người liên hệ | Xoá trắng email/chức danh rồi Lưu không có tác dụng | FE bỏ field rỗng; BE không nhận `null` | ✅ | task-service `ba8f7e1` `fb88b80`, FE `7c16bc5` |
| B6 | 2026-09-24 | Chat — chọn nhiều tin | Thanh chọn ở đầu khung; hover action/bảng cảm xúc vẫn hiện khi đang chọn | Thanh mount trên `MessageList`; bubble không tắt hành động khi chọn | ✅ | FE `6950593` |
| B7 | 2026-09-24 | Commitment Graph | Khó dùng: không thấy tổng quan, chuyển trạng thái khó hiểu, 4 tab rời rạc | Thiết kế cấu trúc | ⏸️ Thay bằng B10 (bỏ hẳn Commitment) — BE `1f80796` sẽ bị gỡ theo B10 | plan `docs/superpowers/plans/2026-09-24-commitment-workspace-redesign.md` (huỷ) |
| B8 | 2026-09-24 | Gợi ý AI | Tin nhắn "hạn cho bạn là tối nay" (gửi 23:58) nhưng AI không điền Hạn chót; hạn chỉ nằm trong mô tả | Chỉ dẫn prompt hiện chỉ cho điền `dueDate` khi có ngày cụ thể, bỏ qua mốc tương đối rõ nghĩa ("hôm nay", "tối nay", "mai") | 🆕 | |
| B9 | 2026-09-24 | Gợi ý AI — loading | Lúc đang phân tích chỉ có skeleton xám + "Phân tích tin nhắn"; không thấy AI đang làm gì | Chưa có trạng thái tiến trình | 🆕 | |
| B10 | 2026-09-24 | Commitment / CR / Scope | Tính năng Cam kết rối, không thực tế → huỷ và dọn sạch code liên quan, chỉ giữ "tạo task với AI" | Quyết định sản phẩm | 🔍 Chờ user chốt phạm vi gỡ | |
| B11 | 2026-09-24 | Quy trình FE | Mọi việc code FE phải dùng skill impeccable để chuẩn hoá và làm đẹp theo quy tắc | Quy ước làm việc | ✅ Đã ghi vào memory + ràng buộc plan FE | |

## Cách báo bug mới

Gửi ảnh + 1–2 câu: đang ở màn nào, làm thao tác gì, thấy gì, mong đợi gì. Claude sẽ thêm dòng mới, điều tra nguyên nhân, cập nhật trạng thái và commit sửa.
