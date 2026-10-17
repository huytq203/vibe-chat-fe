import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

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

  it('chỉ hiện nút Google của mình khi iframe chính thức đã vẽ xong', async () => {
    envMock.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'cid';
    renderGoogleButton.mockImplementationOnce((el: HTMLElement) => {
      el.appendChild(document.createElement('iframe'));
      return Promise.resolve();
    });
    render(<GoogleSignInButton onCredential={vi.fn()} />);

    expect(await screen.findByText('Tiếp tục với Google')).toBeInTheDocument();
  });

  it('chưa vẽ xong thì chỉ hiện khung chờ, không hiện chữ nút', () => {
    envMock.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'cid';
    render(<GoogleSignInButton onCredential={vi.fn()} />);

    expect(screen.queryByText('Tiếp tục với Google')).not.toBeInTheDocument();
  });

  afterEach(() => vi.useRealTimers());
});
