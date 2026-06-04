import type { QueryClient, QueryKey } from '@tanstack/react-query';

const DEFAULT_WAIT_MS = 300;

type TimerMap = Map<string, ReturnType<typeof setTimeout>>;

// Timer gắn theo từng QueryClient (WeakMap → tự dọn khi client bị GC).
const timersByClient = new WeakMap<QueryClient, TimerMap>();

function getTimers(qc: QueryClient): TimerMap {
  let timers = timersByClient.get(qc);
  if (!timers) {
    timers = new Map();
    timersByClient.set(qc, timers);
  }
  return timers;
}

/**
 * Invalidate gộp theo queryKey: nhiều trigger sát nhau (REST `onSuccess` +
 * các WS event echo như `message:deleted`, `conversation:notify`, `message:read`)
 * chỉ tạo 1 lần refetch thay vì N. Tránh spam request danh sách conversation.
 *
 * Mỗi queryKey debounce độc lập (gom theo bản serialize của key).
 */
export function debouncedInvalidate(
  qc: QueryClient,
  queryKey: QueryKey,
  waitMs: number = DEFAULT_WAIT_MS,
): void {
  const timers = getTimers(qc);
const id = JSON.stringify(queryKey);
  const existing = timers.get(id);
  if (existing) clearTimeout(existing);
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      void qc.invalidateQueries({ queryKey });
    }, waitMs),
  );
}
