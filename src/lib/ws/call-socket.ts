import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

/**
 * Wrapper socket.io cho namespace /call (báo hiệu cuộc gọi).
 * Singleton riêng, tách hẳn socket /chat (lib/ws/socket.ts) — xem FRONTEND/23-calls.md §2.
 */
const CALL_WS_URL = env.NEXT_PUBLIC_CALL_WS_URL;

let socket: Socket | null = null;
let tokenProvider: () => string | null = () => null;

export function setCallTokenProvider(fn: () => string | null): void {
  tokenProvider = fn;
}

export function getCallSocket(token: string | null): Socket | null {
  if (!token) {
    if (socket) {
      logger.info('Call WS close (no token)');
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  logger.info('Call WS connecting', { url: CALL_WS_URL });
  socket = io(CALL_WS_URL, {
    auth: (cb) => cb({ token: tokenProvider() ?? token }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    withCredentials: true,
  });

  socket.on('connect', () => logger.info('Call WS connected', { id: socket?.id }));
  socket.on('disconnect', (reason) => {
    logger.info('Call WS disconnect', { reason });
    // BE đá (auth fail...) → socket.io v4 không tự reconnect. Thử lại 1 lần sau 2s.
    if (reason === 'io server disconnect') {
      setTimeout(() => {
        if (socket && tokenProvider()) socket.connect();
      }, 2000);
    }
  });
  socket.on('connect_error', (err) =>
    logger.warn('Call WS connect_error', { msg: err.message }),
  );

  return socket;
}

export function refreshCallSocketAuth(newToken: string | null): void {
  if (!socket) return;
  if (!newToken) {
    socket.disconnect();
    socket = null;
    return;
  }
  socket.auth = { token: newToken };
  if (!socket.connected) socket.connect();
}

export function closeCallSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
