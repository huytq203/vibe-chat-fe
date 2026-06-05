/**
 * Feature flags — bật/tắt tính năng chờ phụ thuộc (vd endpoint BE chưa sẵn sàng).
 * Giữ ở config để flip một chỗ, không rải `if` rải rác trong code.
 */
export const featureFlags = {
  /**
   * Lấy nội dung chia sẻ (ảnh/video/file/link) qua endpoint riêng của BE thay vì
   * suy ra từ các trang message đã nạp trong cache (vốn thiếu do lazy load).
   * Bật khi BE đã ship `GET /conversations/:id/shared` (xem FRONTEND/20-shared-content.md).
   */
  sharedContentApi: true,
} as const;
