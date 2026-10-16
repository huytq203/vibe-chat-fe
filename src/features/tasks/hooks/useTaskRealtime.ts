'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { getTaskSocket } from '../lib/task-socket';
import { getCurrentUser } from '../lib/current-user';
import { scheduleInvalidate } from '../lib/invalidate-scheduler';
import { isLocal } from '../lib/local-mutations';
import { invalidationFor, REALTIME_EVENTS, toSignal, type RealtimeEvent } from '../lib/realtime-invalidation';
import { taskKeys } from '../services/keys';

/**
 * Chiến lược realtime (spec 2026-10-16-realtime-signal-invalidate): socket event
 * chỉ là TÍN HIỆU. Nhận tín hiệu → invalidate đúng query key (gom 400ms) → React
 * Query refetch từ server. Không áp payload vào cache, không dùng seq; nhờ vậy thứ
 * tự event đến không còn ảnh hưởng tính đúng của dữ liệu.
 */

const SOCKET_RETRY_MS = 1000;

/** Danh sách subtask đang có trong cache của project (key: ['tasks', projectId, parentId, 'subtasks']). */
function cachedSubtaskListKeys(qc: QueryClient, projectId: string): QueryKey[] {
  return qc
    .getQueryCache()
    .findAll({
      predicate: (query) =>
        query.queryKey[0] === 'tasks' &&
        query.queryKey[1] === projectId &&
        query.queryKey[3] === 'subtasks',
    })
    .map((query) => query.queryKey);
}

function handleSignal(
  qc: QueryClient,
  projectId: string,
  event: RealtimeEvent,
  payload: unknown,
): void {
  const signal = toSignal(payload);
  // Socket có thể còn ở room của project khác (vừa chuyển board) → bỏ qua
  if (signal.projectId && signal.projectId !== projectId) return;
  // Thay đổi do chính tab này gây ra đã được cập nhật lạc quan; refetch có thể đè ô đang gõ
  if (signal.taskId && isLocal(signal.taskId, event)) return;

  const { keys, subtaskLists } = invalidationFor(event, signal, {
    projectId,
    currentUserId: getCurrentUser()?.userId ?? null,
  });
  for (const key of keys) scheduleInvalidate(qc, key);
  if (subtaskLists) {
    for (const key of cachedSubtaskListKeys(qc, projectId)) scheduleInvalidate(qc, key);
  }
}

export function useTaskRealtime(projectId: string | null): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let teardown: (() => void) | null = null;

    const setup = (): void => {
      if (disposed) return;
      const socket = getTaskSocket();
      if (!socket) {
        // Token chưa sẵn sàng (vd: mount trước khi auth xong) → thử lại
        retryTimer = setTimeout(setup, SOCKET_RETRY_MS);
        return;
      }

      const handlers = new Map<RealtimeEvent, (payload: unknown) => void>();
      for (const event of REALTIME_EVENTS) {
        const handler = (payload: unknown): void => handleSignal(qc, projectId, event, payload);
        handlers.set(event, handler);
        socket.on(event, handler);
      }

      const join = (): void => {
        socket.emit('join-project', { projectId }, (ack: { ok: boolean; error?: string }) => {
          if (!ack?.ok) {
            logger.warn('Task WS join-project bị từ chối', { projectId, error: ack?.error });
          }
        });
      };
      join();

      // Sau reconnect: server đã quên room cũ và có thể đã lỡ event → join lại, làm mới toàn bộ
      const onReconnect = (): void => {
        join();
        scheduleInvalidate(qc, taskKeys.all);
      };
      socket.on('connect', onReconnect);

      teardown = () => {
        socket.off('connect', onReconnect);
        for (const [event, handler] of handlers) socket.off(event, handler);
        socket.emit('leave-project', { projectId });
      };
    };

    setup();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      teardown?.();
    };
  }, [projectId, qc]);
}

/**
 * Warmup socket ngay khi vào khu vực tasks (kể cả chưa chọn project) — để lúc
 * mở board lần đầu đã có kết nối sẵn, không tốn handshake. Retry khi token
 * chưa sẵn sàng lúc mount.
 */
export function useTaskSocketWarmup(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const warm = (): void => {
      if (!getTaskSocket()) timer = setTimeout(warm, SOCKET_RETRY_MS);
    };
    warm();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);
}
