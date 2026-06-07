/**
 * Ringtone bằng WebAudio (không cần file asset).
 * Lưu ý: với cuộc gọi ĐẾN (callee), trình duyệt có thể chặn autoplay audio cho tới khi
 * user tương tác với trang → AudioContext ở trạng thái 'suspended', không kêu. Đây là giới
 * hạn của trình duyệt, không phải bug.
 */
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function beep(): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 480;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  osc.start(t);
  osc.stop(t + 0.45);
}

export function startRingtone(): void {
  stopRingtone();
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  void ctx.resume();
  beep();
  timer = setInterval(beep, 1500);
}

export function stopRingtone(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (ctx) {
    void ctx.close();
    ctx = null;
  }
}
