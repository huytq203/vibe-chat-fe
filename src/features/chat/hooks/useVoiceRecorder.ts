'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceRecording = { file: File; durationSec: number };

/** Chọn mimeType audio đầu tiên trình duyệt hỗ trợ (Chrome→webm/opus, Safari→mp4). */
function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

/**
 * Ghi âm từ micro qua MediaRecorder (wrap browser API — CLAUDE.md §7).
 * `stop()` trả về File + thời lượng (giây) hoặc null nếu huỷ/không có dữ liệu.
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopResolveRef = useRef<((r: VoiceRecording | null) => void) | null>(null);
  const cancelledRef = useRef(false);

  const isSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    if (isRecording || !isSupported) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMime();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const durationSec = Math.max(1, Math.round((Date.now() - startAtRef.current) / 1000));
        const type = rec.mimeType || 'audio/webm';
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunksRef.current, { type });
        const resolve = stopResolveRef.current;
        stopResolveRef.current = null;
        const cancelled = cancelledRef.current;
        cleanup();
        setIsRecording(false);
        setElapsedMs(0);
        if (cancelled || blob.size === 0) {
          resolve?.(null);
          return;
        }
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
        resolve?.({ file, durationSec });
      };

      recorderRef.current = rec;
      startAtRef.current = Date.now();
      rec.start();
      setIsRecording(true);
      setElapsedMs(0);
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startAtRef.current), 200);
    } catch (e) {
      cleanup();
      setIsRecording(false);
      setError(
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'Bạn cần cho phép dùng micro để ghi âm'
          : 'Không thể truy cập micro',
      );
    }
  }, [isRecording, isSupported, cleanup]);

  const stop = useCallback((): Promise<VoiceRecording | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve(null);
        return;
      }
      stopResolveRef.current = resolve;
      cancelledRef.current = false;
      rec.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    cancelledRef.current = true;
    if (rec && rec.state !== 'inactive') {
      rec.stop(); // onstop thấy cancelledRef=true → trả null
    } else {
      cleanup();
      setIsRecording(false);
      setElapsedMs(0);
    }
  }, [cleanup]);

  // Dọn stream/timer khi unmount (tránh giữ micro mở).
  useEffect(() => cleanup, [cleanup]);

  return { isRecording, isSupported, elapsedMs, error, start, stop, cancel };
}
