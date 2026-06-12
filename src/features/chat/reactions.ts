/**
 * Cấu hình thả cảm xúc (emoji reaction) cho tin nhắn.
 *
 * ⚠️ CHƯA có API backend. Toàn bộ UI + hook đã sẵn sàng nhưng bị tắt bằng cờ dưới.
 * Khi BE chốt endpoint:
 *   1. Xác nhận/đổi đường dẫn trong `chatApi.reactToMessage` / `unreactFromMessage`.
 *   2. Đảm bảo Message từ BE có field `reactions` (xem types.ts).
 *   3. Đặt REACTIONS_ENABLED = true.
 */
export const REACTIONS_ENABLED = false;

/** Bộ emoji nhanh hiện trong menu hành động tin nhắn. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
