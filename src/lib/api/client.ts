import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { syncServerTime } from '@/lib/time/server-clock';
import { encryptBlob, decryptBlob } from '@/lib/crypto/transport-cipher';
import { getSessionKey } from '@/lib/crypto/session-key';

export type ApiEnvelope<T> = {
  success: true;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; nextCursor?: string | null };
  timestamp: string;
};

export type ApiErrorBody = {
  success: false;
  error: { code: string; message: string; details?: unknown };
  timestamp: string;
  path?: string;
  requestId?: string | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
};

let accessToken: string | null = null;
let refreshing: Promise<void> | null = null;
let onUnauthorized: (() => void) | null = null;
let onTokenChange: ((token: string | null) => void) | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Refresh sớm trước khi token hết hạn (giây) để tránh request đầu tiên dính 401. */
const REFRESH_SKEW_SECONDS = 60;
/** Khoảng tối thiểu giữa các lần refresh chủ động (giây) — chặn busy-loop khi expiresIn nhỏ. */
const MIN_REFRESH_DELAY_SECONDS = 5;

function clearRefreshTimer(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

const PUBLIC_PATHS = ['/api/v1/auth/', '/api/v1/session/key', '/api/v1/health'];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => path.includes(p));
}

async function cipherRequest(method: string, _path: string, options: RequestOptions, key: CryptoKey): Promise<RequestOptions> {
  if (method === 'GET') {
    // Luôn gửi cipher blob (kể cả không có params) để BE biết response cần encrypt.
    const filtered: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v !== undefined && v !== null) filtered[k] = v as string | number | boolean;
    }
    const blob = await encryptBlob(JSON.stringify(filtered), key);
    return { ...options, query: { params: blob } };
  }
  // POST / PUT / PATCH / DELETE — encrypt body hoặc {} nếu không có body.
  const payload = options.body !== undefined ? options.body : {};
  const blob = await encryptBlob(JSON.stringify(payload), key);
  return { ...options, body: { params: blob } };
}

async function decipherResponse<T>(json: unknown, key: CryptoKey): Promise<T> {
  const envelope = json as { error_code: number; error_message: string; data: string | null };
  if (envelope.error_code !== 0) {
    throw new ApiError(envelope.error_code, String(envelope.error_code), envelope.error_message);
  }
  if (!envelope.data) return undefined as T;
  const plaintext = await decryptBlob(envelope.data, key);
  return JSON.parse(plaintext) as T;
}


/** Lên lịch refresh chủ động: chạy trước khi token hết hạn REFRESH_SKEW_SECONDS giây. */
function scheduleProactiveRefresh(expiresIn?: number): void {
  clearRefreshTimer();
  if (typeof window === 'undefined' || !expiresIn || expiresIn <= 0) return;
  const delaySeconds = Math.max(expiresIn - REFRESH_SKEW_SECONDS, MIN_REFRESH_DELAY_SECONDS);
  refreshTimer = setTimeout(() => {
    // Best-effort: refreshAccessToken tự xử lý onUnauthorized khi thất bại.
    refreshAccessToken().catch(() => undefined);
  }, delaySeconds * 1000);
}

/** Cập nhật access token + lên lịch refresh chủ động dựa trên expiresIn (giây). */
function applyToken(token: string | null, expiresIn?: number): void {
  const changed = accessToken !== token;
  accessToken = token;
  if (token) scheduleProactiveRefresh(expiresIn);
  else clearRefreshTimer();
  if (changed) onTokenChange?.(token);
}

export const apiAuth = {
  setToken(token: string | null, expiresIn?: number) {
    applyToken(token, expiresIn);
  },
  getToken() {
    return accessToken;
  },
  onUnauthorized(handler: (() => void) | null) {
    onUnauthorized = handler;
  },
  onTokenChange(handler: ((token: string | null) => void) | null) {
    onTokenChange = handler;
  },
};

function resolveBase(path: string): string {
  // USE_PROXY=true → same-origin, để Next rewrites proxy. USE_PROXY=false → gọi thẳng BE.
  if (env.NEXT_PUBLIC_USE_PROXY) return '';
  return path.startsWith('/api/v1/auth/') ? env.NEXT_PUBLIC_AUTH_URL : env.NEXT_PUBLIC_VIBE_URL;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = path.startsWith('http') ? path : `${resolveBase(path)}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Resolve URL tuyệt đối cho 1 path API — dùng khi cần upload qua XMLHttpRequest
 * (tiến trình %), nơi không đi qua `request()`/`fetch` wrapper.
 */
export function resolveApiUrl(path: string): string {
  return buildUrl(path);
}

async function rawRequest(method: string, path: string, options: RequestOptions): Promise<Response> {
  const { body, query, headers, auth = true, ...rest } = options;
  const url = buildUrl(path, query);
  // FormData → để browser tự set Content-Type kèm boundary, không stringify.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const finalHeaders: Record<string, string> = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(headers as Record<string, string> | undefined),
  };
  if (auth && accessToken) finalHeaders['Authorization'] = `Bearer ${accessToken}`;

  return fetch(url, {
    method,
    headers: finalHeaders,
    body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
    ...rest,
  });
}

async function refreshAccessToken(): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const res = await fetch(
      buildUrl('/api/v1/auth/refresh'),
      { method: 'POST', credentials: 'include' },
    );
    if (!res.ok) {
      applyToken(null);
      onUnauthorized?.();
      throw new ApiError(res.status, 'AUTH_REFRESH_FAILED', 'Phiên đăng nhập đã hết hạn');
    }
    const json = (await res.json()) as ApiEnvelope<{ accessToken: string; expiresIn: number }>;
    applyToken(json.data.accessToken, json.data.expiresIn);
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function parseError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  const code = body?.error?.code ?? 'INTERNAL_ERROR';
  const message = body?.error?.message ?? res.statusText ?? 'Có lỗi xảy ra';
  return new ApiError(res.status, code, message, body?.error?.details);
}

/**
 * 401 với code AUTH_SESSION_REVOKED = phiên bị thu hồi (login thiết bị khác)
 * → logout ngay, KHÔNG retry refresh. Trả về ApiError nếu đúng case này.
 */
async function checkSessionRevoked(res: Response, path: string): Promise<ApiError | null> {
  const err = await parseError(res.clone());
  if (err.code !== 'AUTH_SESSION_REVOKED') return null;
  logger.warn('Session revoked', { path });
  applyToken(null);
  onUnauthorized?.();
  return err;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const sessionKey = getSessionKey();
  const shouldCipher = !!sessionKey && !isPublicPath(path);
  const cipheredOptions = shouldCipher ? await cipherRequest(method, path, options, sessionKey) : options;

  let res = await rawRequest(method, path, cipheredOptions);

  if (res.status === 401 && options.auth !== false && accessToken) {
    const revoked = await checkSessionRevoked(res, path);
    if (revoked) throw revoked;
    try {
      await refreshAccessToken();
      res = await rawRequest(method, path, cipheredOptions);
    } catch (e) {
      logger.warn('Refresh failed', { path });
      throw e;
    }
  }

  if (!res.ok) {
    const err = await parseError(res);
    logger.warn('API error', { path, status: err.status, code: err.code });
    throw err;
  }

  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as unknown;

  if (shouldCipher) {
    return decipherResponse<T>(json, sessionKey);
  }

  // Legacy format (auth service / public endpoints)
  if (json && typeof json === 'object') {
    if ('timestamp' in (json as object)) {
      syncServerTime((json as ApiEnvelope<T>).timestamp);
    }
    if ('success' in (json as object) && 'data' in (json as object)) {
      return (json as ApiEnvelope<T>).data;
    }
    if ('error_code' in (json as object) && 'data' in (json as object)) {
      return (json as { data: T }).data;
    }
  }
  return json as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
  rawWithMeta: async <T>(method: string, path: string, options: RequestOptions = {}) => {
    const sessionKey = getSessionKey();
    const shouldCipher = !!sessionKey && !isPublicPath(path);
    const cipheredOptions = shouldCipher ? await cipherRequest(method, path, options, sessionKey) : options;

    let res = await rawRequest(method, path, cipheredOptions);
    if (res.status === 401 && options.auth !== false && accessToken) {
      const revoked = await checkSessionRevoked(res, path);
      if (revoked) throw revoked;
      await refreshAccessToken();
      res = await rawRequest(method, path, cipheredOptions);
    }
    if (!res.ok) throw await parseError(res);
    const json = (await res.json()) as unknown;
    if (shouldCipher) {
      type Meta = ApiEnvelope<T>['meta'];
      type WithMeta = { data: T; meta?: Meta };
      const inner = await decipherResponse<WithMeta | T>(json, sessionKey);
      if (inner && typeof inner === 'object' && 'data' in (inner as object)) {
        const typed = inner as WithMeta;
        return { data: typed.data, meta: typed.meta };
      }
      return { data: inner as T, meta: undefined };
    }
    const envelope = json as ApiEnvelope<T>;
    syncServerTime(envelope.timestamp);
    return { data: envelope.data, meta: envelope.meta };
  },
} as const;
