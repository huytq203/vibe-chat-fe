import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';

const envMock = vi.hoisted(() => ({ env: { NEXT_PUBLIC_GOOGLE_CLIENT_ID: undefined as string | undefined } }));
vi.mock('@/config/env', () => envMock);
const renderGoogleButton = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/google/identity', () => ({ renderGoogleButton }));

import { GoogleSignInButton } from './GoogleSignInButton';

describe('GoogleSignInButton', () => {
  it('ẩn hoàn toàn khi chưa cấu hình client id', () => {
    envMock.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = undefined;
    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(renderGoogleButton).not.toHaveBeenCalled();
  });

  it('render nút GIS với client id cấu hình', async () => {
    envMock.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'cid';
    render(<GoogleSignInButton onCredential={vi.fn()} />);

    await waitFor(() => expect(renderGoogleButton).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ clientId: 'cid' })));
  });

  it('vẽ lại nút khi GIS chạy xong mà container vẫn trống, rồi báo lỗi sau số lần thử tối đa', async () => {
    vi.useFakeTimers();
    envMock.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'cid';
    renderGoogleButton.mockClear();
    const { findByText } = render(<GoogleSignInButton onCredential={vi.fn()} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500 * 4);
    });

    expect(renderGoogleButton).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
    expect(await findByText(/Không tải được đăng nhập Google/)).toBeTruthy();
  });

  afterEach(() => vi.useRealTimers());
});
