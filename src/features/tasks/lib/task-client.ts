import { env } from '@/config/env';
import { apiAuth } from '@/lib/api/client';

/**
 * Client riêng cho task-service. KHÔNG đi qua `apiClient` của chat backend —
 * apiClient dùng envelope khác; task-service trả plain
 * `{ success, data, meta?, timestamp }`. Token Keycloak được chia sẻ (cùng realm).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: unknown;
  error?: { code: string; message: string };
}

/**
 * Base URL cho task-service.
 * - USE_PROXY=true (web/dev): gọi same-origin '/task-proxy/...' → Next rewrites sang task-service,
 *   tránh CORS hoàn toàn (đồng bộ kiến trúc với chat apiClient).
 * - USE_PROXY=false (electron/gọi thẳng): dùng NEXT_PUBLIC_TASK_URL (task-service phải bật CORS).
 */
function taskBase(): string {
  return env.NEXT_PUBLIC_USE_PROXY ? '/task-proxy' : env.NEXT_PUBLIC_TASK_URL;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = apiAuth.getToken();
  const res = await fetch(`${taskBase()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  // DELETE trả 204 No Content (body rỗng) → không parse JSON, tránh lỗi "Unexpected end of JSON input"
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Envelope<T>) : null;
  if (!res.ok || (json !== null && !json.success)) {
    throw new Error(json?.error?.message ?? `Request failed: ${res.status}`);
  }
  return (json ? json.data : undefined) as T;
}

/** Như `request` nhưng giữ lại `meta` — dùng cho endpoint phân trang. */
async function requestPaged<T, M>(
  method: string,
  path: string,
): Promise<{ data: T; meta: M }> {
  const token = apiAuth.getToken();
  const res = await fetch(`${taskBase()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Envelope<T>) : null;
  if (!res.ok || (json !== null && !json.success)) {
    throw new Error(json?.error?.message ?? `Request failed: ${res.status}`);
  }
  return { data: json?.data as T, meta: json?.meta as M };
}

export const taskClient = {
  get: <T>(path: string) => request<T>('GET', path),
  getPaged: <T, M>(path: string) => requestPaged<T, M>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
