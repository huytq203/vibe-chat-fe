import { io, type Socket } from 'socket.io-client';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { applyEventMap, clearEventMap } from './event-map';
import { getSessionKey } from '@/lib/crypto/session-key';
import { decryptBlob } from '@/lib/crypto/transport-cipher';

/**
 * Wrapper socket.io — feature code không import 'socket.io-client' trực tiếp.
 * Singleton: 1 socket / tab, reconnect tự động khi token đổi.
 *
 * Auth: gửi access token qua `auth.token` (FRONTEND.md §4). Khi token rotate
 * (REST auto-refresh) → gọi `refreshSocketAuth()` để socket lấy token mới.
 *
 * Reconnect strategy: exponential backoff 1s → 30s với jitter 50%.
 * Token luôn được làm mới trước mỗi lần reconnect qua dynamic auth callback.
 */

const WS_URL = env.NEXT_PUBLIC_WS_URL;

// ── Connection state ─────────────────────────────────────────────────────────

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';

let connectionState: ConnectionState = 'disconnected';
const connectionStateListeners = new Set<(state: ConnectionState) => void>();

function setConnectionState(state: ConnectionState): void {
  if (connectionState === state) return;
  connectionState = state;
  for (const cb of connectionStateListeners) {
    try { cb(state); } catch { /* listener không được crash socket */ }
  }
}

/** Lấy trạng thái kết nối hiện tại (không cần subscribe). */
export function getConnectionState(): ConnectionState {
  return connectionState;
}

/**
 * Subscribe vào thay đổi trạng thái kết nối.
 * @returns hàm unsubscribe — gọi trong cleanup của hook/component.
 */
export function onConnectionStateChange(cb: (state: ConnectionState) => void): () => void {
  connectionStateListeners.add(cb);
  return () => connectionStateListeners.delete(cb);
}

// ── Core state ───────────────────────────────────────────────────────────────

let socket: Socket | null = null;
let tokenProvider: () => string | null = () => null;
let forceLogoutHandler: (() => void) | null = null;
// true sau khi BE thu hồi phiên (force_logout / AUTH_SESSION_REVOKED) — chặn auto-reconnect với token cũ.
let sessionRevoked = false;

export function setTokenProvider(fn: () => string | null): void {
  tokenProvider = fn;
}

/** Đăng ký callback khi BE thu hồi phiên (login trên thiết bị khác). App layer xử lý clear session + redirect. */
export function setForceLogoutHandler(fn: (() => void) | null): void {
  forceLogoutHandler = fn;
}

function handleSessionRevoked(source: string): void {
  if (sessionRevoked) return;
  sessionRevoked = true;
  logger.info('WS session revoked', { source });
  closeSocket();
  forceLogoutHandler?.();
}

export function getSocket(token: string | null): Socket | null {
  if (!token) {
    if (socket) {
      logger.info('WS close (no token)');
      socket.disconnect();
      socket = null;
    }
    setConnectionState('disconnected');
    return null;
  }

  if (socket) {
    // Cập nhật token cho lần (re)connect tiếp theo nếu đổi.
    socket.auth = { token };
    if (!socket.connected) {
      setConnectionState('connecting');
      socket.connect();
    }
    return socket;
  }

  logger.info('WS connecting', { url: WS_URL });
  sessionRevoked = false;
  setConnectionState('connecting');

  socket = io(WS_URL, {
    // Bỏ qua HTTP long-polling, kết nối thẳng WebSocket ngay từ đầu.
    // Default ['polling', 'websocket'] sẽ spam XHR liên tục nếu upgrade thất bại.
    transports: ['websocket'],
    // Dynamic auth callback: luôn lấy token mới nhất tại thời điểm (re)connect.
    // Điều này tự động cập nhật token sau mỗi lần REST auto-refresh, không cần thêm logic riêng.
    auth: (cb) => cb({ token: tokenProvider() ?? token }),
    reconnection: true,
    reconnectionAttempts: Infinity,  // không bỏ cuộc — chờ mạng quay lại
    reconnectionDelay: 1000,         // bắt đầu 1s
    reconnectionDelayMax: 30000,     // tối đa 30s
    randomizationFactor: 0.5,        // jitter ±50% để tránh thundering herd
    timeout: 20000,                  // connection timeout 20s
    withCredentials: true,
  });

  socket.on('connect', () => {
    logger.info('WS connected', { id: socket?.id });
    setConnectionState('connected');
    // Listen for event map from server (sent on auth connect)
    socket?.once('e0', async (blob: unknown) => {
      try {
        const key = getSessionKey();
        if (!key || typeof blob !== 'string') return;
        const json = await decryptBlob(blob, key);
        applyEventMap(JSON.parse(json) as Record<string, string>);
      } catch { /* ignore */ }
    });
  });

  // BE emit khi user login trên thiết bị khác (single-session kick) → logout ngay, không reconnect.
  socket.on('force_logout', () => handleSessionRevoked('force_logout'));

  socket.on('disconnect', (reason, description) => {
    logger.info('WS disconnect', { reason, description });
    setConnectionState('disconnected');
    clearEventMap();
    // BE chủ động đá (auth fail, kick...) → socket.io v4 KHÔNG tự reconnect.
    // Thử reconnect 1 lần sau 2s với token mới nhất; nếu vẫn fail BE sẽ đá tiếp.
    // Riêng phiên đã bị thu hồi (force_logout) → KHÔNG reconnect.
    if (reason === 'io server disconnect' && !sessionRevoked) {
      setTimeout(() => {
        if (socket && !sessionRevoked && tokenProvider()) {
          logger.info('WS manual reconnect after server kick');
          // Làm mới auth với token mới nhất trước khi reconnect thủ công.
          socket.auth = { token: tokenProvider() };
          socket.connect();
        }
      }, 2000);
    }
  });

  // reconnect_attempt: socket.io đang thử lại sau network drop / transport close.
  // Cập nhật auth với token mới nhất để đảm bảo không dùng token cũ đã expire.
  socket.on('reconnect_attempt', (attempt: number) => {
    const latestToken = tokenProvider();
    logger.info('WS reconnect_attempt', { attempt, hasToken: Boolean(latestToken) });
    setConnectionState('connecting');
    if (latestToken) {
      socket!.auth = { token: latestToken };
    }
  });

  socket.on('reconnect', (attempt: number) => {
    logger.info('WS reconnected', { attempt });
    // 'connect' event cũng được emit sau reconnect — setConnectionState('connected') xử lý ở đó.
  });

  socket.on('reconnect_failed', () => {
    // Chỉ xảy ra khi reconnectionAttempts là finite và đã cạn kiệt.
    // Với Infinity ở trên, event này không bao giờ fire — giữ để phòng thủ.
    logger.warn('WS reconnect_failed — giving up');
    setConnectionState('disconnected');
  });

  socket.on('connect_error', (err) => {
    const data = (err as { data?: { code?: string } }).data;
    logger.warn('WS connect_error', { msg: err.message, data });
    if (data?.code === 'AUTH_SESSION_REVOKED' || err.message === 'AUTH_SESSION_REVOKED') {
      handleSessionRevoked('connect_error');
    }
  });

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
  setConnectionState('disconnected');
}

/** Emit with cipher: sends payload plain (BE WebSocket handlers do not decrypt cipher blobs). */
export async function cipherEmit(event: string, payload: unknown): Promise<void> {
  if (!socket) return;
  socket.emit(event, payload);
}

/** Subscribe with cipher: decrypts payload if it's an encrypted string blob. */
export function cipherOn(event: string, handler: (data: unknown) => void): () => void {
  if (!socket) return () => undefined;
  const wrappedHandler = async (blob: unknown) => {
    const key = getSessionKey();
    if (!key || typeof blob !== 'string') {
      handler(blob);
      return;
    }
    try {
      handler(JSON.parse(await decryptBlob(blob, key)));
    } catch {
      handler(blob); // fallback: pass raw
    }
  };
  socket.on(event, wrappedHandler);
  return () => { socket?.off(event, wrappedHandler); };
}
