import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const bootstrap = vi.hoisted(() => vi.fn(() => null));
vi.mock('@/features/auth', () => ({ AuthBootstrap: bootstrap }));
vi.mock('@/features/auth/components/LoginEntry', () => ({ LoginEntry: () => null }));
vi.mock('./_components/LoginPageShell', () => ({ LoginPageShell: ({ children }: { children: React.ReactNode }) => children }));

import LoginPage from './page';

describe('LoginPage', () => {
  it('không tự chuyển vào /chat khi trang được app desktop mở', async () => {
    render(await LoginPage({ searchParams: Promise.resolve({ client: 'desktop', state: 's'.repeat(16), code_challenge: 'c'.repeat(43) }) }));
    expect(bootstrap).toHaveBeenCalledWith(expect.objectContaining({ redirectIfAuthed: undefined }), undefined);
  });

  it('chuyển vào /chat khi đã đăng nhập ở web thường', async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(bootstrap).toHaveBeenLastCalledWith(expect.objectContaining({ redirectIfAuthed: '/chat' }), undefined);
  });
});
