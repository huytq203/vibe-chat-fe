/**
 * Chuông cuộc gọi: phát file nhạc thật (tách gọi đến / gọi đi) qua wrapper lib/sound.
 * Fallback WebAudio beep khi file không phát được (autoplay bị chặn / lỗi tải) để vẫn có tín hiệu.
 * Lưu ý: với cuộc gọi ĐẾN, trình duyệt có thể chặn autoplay tới khi user tương tác — giới hạn của
 * trình duyệt, không phải bug.
 */
import { playLoop, stopSound } from '@/lib/sound/player';

export type RingtoneKind = 'incoming' | 'outgoing';

const SRC: Record<RingtoneKind, string> = {
  incoming: '/sounds/call-incoming.wav',
  outgoing: '/sounds/call-outgoing.wav',
};

let ctx: AudioContext | null = null;
let beepTimer: ReturnType<typeof setInterval> | null = null;

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

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

function startBeepFallback(): void {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  void ctx.resume();
  beep();
  beepTimer = setInterval(beep, 1500);
}

function stopBeepFallback(): void {
  if (beepTimer) {
    clearInterval(beepTimer);
    beepTimer = null;
  }
  if (ctx) {
    void ctx.close();
    ctx = null;
  }
}

export function startRingtone(kind: RingtoneKind): void {
  stopRingtone();
  if (typeof window === 'undefined') return;
  if (typeof Audio !== 'undefined') {
    playLoop(SRC[kind]);
    return;
  }
  startBeepFallback();
}

export function stopRingtone(): void {
  stopSound();
  stopBeepFallback();
}
