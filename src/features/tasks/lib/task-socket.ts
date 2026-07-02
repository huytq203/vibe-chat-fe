import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';
import { apiAuth } from '@/lib/api/client';
import { logger } from '@/lib/logger';

/**
 * Socket riêng cho task-service (namespace /tasks) — tách khỏi chat socket
 * vì task-service dùng envelope thuần, KHÔNG có session-key cipher.
 * Singleton: 1 socket / tab. Auth = Keycloak token dùng chung với REST
 * (apiAuth.getToken), luôn lấy token mới nhất tại thời điểm (re)connect.
 */

let socket: Socket | null = null;

function buildUrl(): string {
  const base = env.NEXT_PUBLIC_TASK_WS_URL.replace(/\/$/, '');
  // Namespace /tasks — cho phép env đã chứa sẵn hoặc chưa
  return base.endsWith('/tasks') ? base : `${base}/tasks`;
}

export function getTaskSocket(): Socket | null {
  const token = apiAuth.getToken();
  if (!token) return null;

  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(buildUrl(), {
    transports: ['websocket'],
    // Dynamic auth: token mới nhất cho mỗi lần (re)connect — không cần wiring refresh riêng
    auth: (cb) => cb({ token: apiAuth.getToken() ?? token }),
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    timeout: 20000,
    withCredentials: true,
  });

  socket.on('connect', () => {
    logger.info('Task WS connected', { id: socket?.id });
  });

  socket.on('disconnect', (reason) => {
    logger.info('Task WS disconnect', { reason });
    // BE chủ động đá (vd: token hết hạn) → socket.io v4 không tự reconnect
    if (reason === 'io server disconnect') {
      setTimeout(() => {
        if (socket && apiAuth.getToken()) socket.connect();
      }, 2000);
    }
  });

  socket.on('connect_error', (err) => {
    logger.warn('Task WS connect_error', { msg: err.message });
  });

  return socket;
}

export function closeTaskSocket(): void {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
