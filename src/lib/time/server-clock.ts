/**
 * Bù lệch đồng hồ client ↔ server.
 *
 * Đồng hồ máy user có thể sai vài chục giây → mốc giờ optimistic (createdAt) và
 * đếm ngược tin tự huỷ (xem 15-edit-recall-selfdestruct.md) bị lệch: hai máy hiện
 * giờ gửi khác nhau, TTL ngắn (<1') bị cộng thêm phần lệch.
 *
 * Cách xử lý: lấy offset từ field `timestamp` server trả trong MỌI ApiEnvelope,
 * rồi quy mọi phép tính "bây giờ" về giờ server qua `serverNow()`.
 */

let offsetMs = 0;

/** Cập nhật offset từ mốc thời gian server (ISO). Bỏ qua nếu không parse được. */
export function syncServerTime(serverIso: string | undefined | null): void {
  if (!serverIso) return;
  const serverMs = Date.parse(serverIso);
  if (Number.isNaN(serverMs)) return;
  offsetMs = serverMs - Date.now();
}

/** "Bây giờ" theo giờ server (ms epoch) — đã bù lệch đồng hồ máy. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}
