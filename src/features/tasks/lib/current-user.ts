import { apiAuth } from '@/lib/api/client';

export interface CurrentUserInfo {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  try {
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

export function getCurrentUser(): CurrentUserInfo | null {
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
  return { userId: sub, displayName: name, avatarUrl: picture };
}
