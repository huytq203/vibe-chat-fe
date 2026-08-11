import { apiAuth } from '@/lib/api/client';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { normalizeDisplayName } from './normalize-display-name';

export interface CurrentUserInfo {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getCurrentUser(): CurrentUserInfo | null {
  // /users/me là nguồn profile chuẩn và đã được AuthBootstrap nạp vào store.
  // Không đọc displayName trực tiếp từ JWT vì payload là base64url chứa byte UTF-8.
  const authUser = useAuthStore.getState().user;
  if (authUser) {
    const rawDisplayName = authUser.displayName?.trim() || authUser.username.trim() || authUser.id;
    const displayName = normalizeDisplayName(rawDisplayName);
    return {
      userId: authUser.id,
      displayName,
      avatarUrl: authUser.avatarUrl,
    };
  }

  // Fallback cho thời điểm bootstrap chưa hoàn tất. Payload vẫn phải được decode UTF-8.
  const token = apiAuth.getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const sub = payload['sub'];
  if (typeof sub !== 'string') return null;
  const name =
    typeof payload['name'] === 'string'
      ? payload['name']
      : typeof payload['preferred_username'] === 'string'
        ? payload['preferred_username']
        : sub;
  const picture = typeof payload['picture'] === 'string' ? payload['picture'] : null;
  return { userId: sub, displayName: normalizeDisplayName(name), avatarUrl: picture };
}
