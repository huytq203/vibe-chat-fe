import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevicesTab } from './DevicesTab';
import type { UserSessionInfo } from '@/features/settings/types';

const SESSIONS: UserSessionInfo[] = [
  {
    sessionId: 'sess-web',
    deviceType: 'WEB',
    deviceName: 'Chrome trên macOS',
    ipAddress: '1.2.3.4',
    userAgent: 'ua-web',
    createdAt: '2026-06-15T00:00:00.000Z',
    lastSeenAt: '2026-06-15T09:00:00.000Z',
    current: true,
  },
  {
    sessionId: 'sess-desktop',
    deviceType: 'DESKTOP',
    deviceName: 'Halo Desktop · Windows',
    ipAddress: '5.6.7.8',
    userAgent: 'ua-desktop',
    createdAt: '2026-06-10T00:00:00.000Z',
    lastSeenAt: '2026-06-14T09:00:00.000Z',
    current: false,
  },
];

vi.mock('@/config/env', () => ({
  env: {
    NEXT_PUBLIC_AUTH_URL: 'http://test',
    NEXT_PUBLIC_VIBE_URL: 'http://test',
    NEXT_PUBLIC_WS_URL: 'http://test',
    NEXT_PUBLIC_CALL_WS_URL: 'http://test',
    NEXT_PUBLIC_USE_PROXY: true,
  },
}));

const revokeMutate = vi.fn();
const revokeOthersMutate = vi.fn();
const revokeAllMutate = vi.fn();
const routerPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('@/features/settings/hooks/use-sessions', () => ({
  useSessions: () => ({ data: SESSIONS, isLoading: false, isError: false }),
  useRevokeSession: () => ({ mutate: revokeMutate, isPending: false, variables: undefined }),
  useRevokeOtherSessions: () => ({ mutate: revokeOthersMutate, isPending: false }),
  useRevokeAllSessions: () => ({ mutate: revokeAllMutate, isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('DevicesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị tên cả hai thiết bị', () => {
    render(<DevicesTab />);
    expect(screen.getByText('Chrome trên macOS')).toBeTruthy();
    expect(screen.getByText('Halo Desktop · Windows')).toBeTruthy();
  });

  it('thiết bị hiện tại có badge "Thiết bị này" và không có nút Đăng xuất', () => {
    render(<DevicesTab />);
    const currentRow = screen.getByText('Chrome trên macOS').closest('li');
    expect(currentRow).toBeTruthy();
    const row = within(currentRow as HTMLElement);
    expect(row.getByText('Thiết bị này')).toBeTruthy();
    expect(row.queryByRole('button', { name: /đăng xuất/i })).toBeNull();
  });

  it('click "Đăng xuất" ở thiết bị khác gọi mutate với đúng sessionId', async () => {
    render(<DevicesTab />);
    const otherRow = screen.getByText('Halo Desktop · Windows').closest('li');
    const button = within(otherRow as HTMLElement).getByRole('button', { name: /đăng xuất/i });
    await userEvent.click(button);
    expect(revokeMutate).toHaveBeenCalledWith('sess-desktop', expect.any(Object));
  });

  it('hiển thị nút "Đăng xuất tất cả thiết bị khác"', () => {
    render(<DevicesTab />);
    expect(
      screen.getByRole('button', { name: /đăng xuất tất cả thiết bị khác/i }),
    ).toBeTruthy();
  });
});
