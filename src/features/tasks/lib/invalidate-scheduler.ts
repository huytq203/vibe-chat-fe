import type { QueryClient, QueryKey } from '@tanstack/react-query';

export type ScheduleInvalidate = (queryKey: QueryKey) => void;

/** Gom invalidate theo query key trong một cửa sổ ngắn để tránh bão refetch. */
export function createInvalidateScheduler(
  queryClient: QueryClient,
  delayMs: number,
): ScheduleInvalidate {
  const pending = new Map<string, QueryKey>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    timer = null;
    const queryKeys = [...pending.values()];
    pending.clear();
    for (const queryKey of queryKeys) {
      void queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false });
    }
  };

  return (queryKey) => {
    pending.set(JSON.stringify(queryKey), queryKey);
    if (!timer) timer = setTimeout(flush, delayMs);
  };
}

const schedulers = new WeakMap<QueryClient, ScheduleInvalidate>();

/** Scheduler dùng chung cho mỗi QueryClient của task realtime. */
export function scheduleInvalidate(queryClient: QueryClient, queryKey: QueryKey): void {
  let schedule = schedulers.get(queryClient);
  if (!schedule) {
    schedule = createInvalidateScheduler(queryClient, 400);
    schedulers.set(queryClient, schedule);
  }
  schedule(queryKey);
}
