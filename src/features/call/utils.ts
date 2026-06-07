const ERROR_MESSAGES: Record<string, string> = {
  CALL_CALLEE_BUSY: 'Máy bận',
  CALL_ALREADY_ENDED: 'Cuộc gọi đã kết thúc',
  CALL_NOT_FOUND: 'Không tìm thấy cuộc gọi',
  CALL_NOT_PARTICIPANT: 'Bạn không thuộc cuộc gọi này',
  CONVERSATION_MEMBER_REQUIRED: 'Bạn không phải thành viên hội thoại',
  FORBIDDEN: 'Bạn không có quyền thực hiện',
  AUTH_TOKEN_INVALID: 'Phiên đăng nhập hết hạn',
};

export function mapCallErrorCode(code: string, fallback = 'Cuộc gọi thất bại'): string {
  return ERROR_MESSAGES[code] ?? fallback;
}

/** Diễn giải lỗi khi không lấy được mic/cam hoặc connect LiveKit thất bại. */
export function describeMediaError(err: unknown): string {
  // Secure-context: getUserMedia chỉ chạy trên HTTPS hoặc http://localhost.
  if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
    return 'Trình duyệt chặn mic/cam — cần chạy qua HTTPS hoặc localhost';
  }
  const name =
    err && typeof err === 'object' && 'name' in err
      ? String((err as { name: unknown }).name)
      : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Bạn đã chặn quyền micro/camera';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Không tìm thấy thiết bị micro/camera';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Micro/camera đang bị ứng dụng khác chiếm';
    default:
      return 'Không kết nối được cuộc gọi';
  }
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
