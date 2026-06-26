import { env } from '@/config/env';
import { apiAuth } from '@/lib/api/client';

/**
 * Client riêng cho task-service. KHÔNG đi qua `apiClient` của chat backend —
 * apiClient áp session-key cipher + envelope khác; task-service trả plain
 * `{ success, data, meta?, timestamp }`. Token Keycloak được chia sẻ (cùng realm).
 */
interface Envelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = apiAuth.getToken();
  const res = await fetch(`${env.NEXT_PUBLIC_TASK_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json()) as Envelope<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? `Request failed: ${res.status}`);
  }
  return json.data;
}

export const taskClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
