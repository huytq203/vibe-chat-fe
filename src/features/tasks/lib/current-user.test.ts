import { afterEach, describe, expect, it } from 'vitest';
import { apiAuth } from '@/lib/api/client';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import type { AuthUser } from '@/features/auth/types';
import { getCurrentUser } from './current-user';

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    username: 'huytq',
    email: null,
    phone: null,
    displayName: 'Huy đây',
    avatarUrl: 'https://example.com/avatar.webp',
    coverUrl: null,
    bio: null,
    gender: null,
    dateOfBirth: null,
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    ...overrides,
  };
}

function makeJwt(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `header.${encoded}.signature`;
}

describe('getCurrentUser', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, hydrated: false });
    apiAuth.setToken(null);
  });

  it('ưu tiên profile chuẩn trong auth store và giữ nguyên tên tiếng Việt', () => {
    const brokenName = Buffer.from('Huy đây', 'utf8').toString('latin1');
    useAuthStore.setState({
      user: makeUser({ displayName: brokenName }),
      isAuthenticated: true,
      hydrated: true,
    });
    apiAuth.setToken(makeJwt({ sub: 'jwt-user', name: 'Tên trong JWT' }));

    expect(getCurrentUser()).toEqual({
      userId: 'user-1',
      displayName: 'Huy đây',
      avatarUrl: 'https://example.com/avatar.webp',
    });
  });

  it('decode payload JWT bằng UTF-8 khi auth store chưa hydrate', () => {
    apiAuth.setToken(
      makeJwt({
        sub: 'user-2',
        name: 'Nguyễn Hữu Trọng 🚀',
        picture: 'https://example.com/user-2.webp',
      }),
    );

    expect(getCurrentUser()).toEqual({
      userId: 'user-2',
      displayName: 'Nguyễn Hữu Trọng 🚀',
      avatarUrl: 'https://example.com/user-2.webp',
    });
  });

  it('dùng username khi profile chưa có displayName', () => {
    useAuthStore.setState({
      user: makeUser({ displayName: null, username: 'huytq203' }),
      isAuthenticated: true,
      hydrated: true,
    });

    expect(getCurrentUser()?.displayName).toBe('huytq203');
  });
});
