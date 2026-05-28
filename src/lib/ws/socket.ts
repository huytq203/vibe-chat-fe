import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

/**
 * Wrapper socket.io — feature code không import 'socket.io-client' trực tiếp.
 * Singleton: 1 socket / tab, reconnect tự động khi token đổi.
 *
 * Auth: gửi access token qua `auth.token` (FRONTEND.md §4). Khi token rotate
 * (REST auto-refresh) → gọi `refreshSocketAuth()` để socket lấy token mới.
 */

const WS_URL = env.NEXT_PUBLIC_WS_URL;

let socket: Socket | null = null;
let tokenProvider: () => string | null = () => null;

export function setTokenProvider(fn: () => string | null): void {
  tokenProvider = fn;
}

export function getSocket(token: string | null): Socket | null {
  if (!token) {
    if (socket) {
      logger.info('WS close (no token)');
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (socket) {
    // Cập nhật token cho lần (re)connect tiếp theo nếu đổi.
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  logger.info('WS connecting', { url: WS_URL });
  socket = io(WS_URL, {
    auth: (cb) => cb({ token: tokenProvider() ?? token }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    withCredentials: true,
  });

  socket.on('connect', () => logger.info('WS connected', { id: socket?.id }));
  socket.on('disconnect', (reason, description) => {
    logger.info('WS disconnect', { reason, description });
    // BE chủ động đá (auth fail, kick...) → socket.io v4 KHÔNG tự reconnect.
    // Thử reconnect 1 lần sau 2s với token mới nhất; nếu vẫn fail BE sẽ đá tiếp.
    if (reason === 'io server disconnect') {
      setTimeout(() => {
        if (socket && tokenProvider()) {
          logger.info('WS manual reconnect after server kick');
          socket.connect();
        }
      }, 2000);
    }
  });
  socket.on('connect_error', (err) =>
    logger.warn('WS connect_error', {
      msg: err.message,
      data: (err as { data?: unknown }).data,
    }),
  );
  socket.on('error', (err: unknown) => {
    let payload: unknown = err;
    if (err && typeof err === 'object') {
      try {
        payload = JSON.parse(JSON.stringify(err));
      } catch {
        payload = { raw: String(err) };
      }
    }
    logger.warn('WS server error', { err: payload });
  });

  return socket;
}

export function refreshSocketAuth(newToken: string | null): void {
  if (!socket) return;
  if (!newToken) {
    socket.disconnect();
    socket = null;
    return;
  }
  socket.auth = { token: newToken };
  if (!socket.connected) socket.connect();
}

export function closeSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
