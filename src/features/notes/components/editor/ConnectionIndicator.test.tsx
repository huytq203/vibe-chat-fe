import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectionIndicator } from './ConnectionIndicator';

const mocks = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }));

beforeEach(() => vi.clearAllMocks());

describe('chỉ báo kết nối cộng tác', () => {
  it('không render gì khi tài liệu đã đồng bộ', () => {
    const { container } = render(
      <ConnectionIndicator status="connected" isSynced error={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('hiện nguyên văn lý do máy chủ khi bị từ chối', () => {
    const serverMessage = 'This page already has 50 people connected, please try again later';
    render(
      <ConnectionIndicator status="disconnected" isSynced={false} error={serverMessage} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(serverMessage);
  });

  it('chỉ toast một lần với lỗi trang đủ 50 người', () => {
    const serverMessage = 'This page already has 50 people connected, please try again later';
    const { rerender } = render(
      <ConnectionIndicator status="disconnected" isSynced={false} error={serverMessage} />,
    );
    rerender(
      <ConnectionIndicator status="disconnected" isSynced={false} error={serverMessage} />,
    );

    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).toHaveBeenCalledWith(serverMessage);
  });

  it('nói rõ dữ liệu đang lưu cục bộ khi mất mạng', () => {
    render(<ConnectionIndicator status="offline" isSynced error={null} />);

    expect(screen.getByRole('status')).toHaveTextContent('Đang lưu cục bộ');
  });
});
