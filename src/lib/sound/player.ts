/**
 * Wrapper phát âm thanh ngắn dạng loop (chuông call…) bằng HTMLAudioElement.
 * Feature không tự new Audio — gọi qua đây để dễ thay đổi/triệt tiêu khi test.
 * Lưu ý: trình duyệt có thể chặn autoplay tới khi user tương tác → play() reject,
 * ta nuốt lỗi (không throw) để không vỡ luồng call.
 */
import { logger } from '@/lib/logger';

let current: HTMLAudioElement | null = null;

/** Phát 1 nguồn âm thanh ở chế độ loop. Gọi lại sẽ thay nguồn đang phát. */
export function playLoop(src: string): void {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
  stopSound();
  const audio = new Audio(src);
  audio.loop = true;
  current = audio;
  void audio.play().catch((err: unknown) => {
    logger.debug('Ringtone autoplay bị chặn/không phát được', {
      message: err instanceof Error ? err.message : String(err),
    });
  });
}

/** Dừng và giải phóng nguồn âm thanh đang phát (nếu có). */
export function stopSound(): void {
  if (!current) return;
  current.pause();
  current.currentTime = 0;
  current = null;
}
