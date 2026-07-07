import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialLoginRow } from './SocialLoginRow';

describe('SocialLoginRow', () => {
  it('renders 3 disabled provider buttons with accessible labels', () => {
    render(<SocialLoginRow />);

    const google = screen.getByRole('button', { name: 'Đăng nhập với Google' });
    const facebook = screen.getByRole('button', { name: 'Đăng nhập với Facebook' });
    const github = screen.getByRole('button', { name: 'Đăng nhập với GitHub' });

    expect(google).toBeDisabled();
    expect(facebook).toBeDisabled();
    expect(github).toBeDisabled();
  });

  // Xác nhận Tooltip trigger→content wiring hoạt động đúng (nội dung tooltip
  // hiển thị khi hover). KHÔNG bảo vệ trước regression "bỏ span wrapper, dùng
  // Button disabled làm trigger trực tiếp": user-event's hover() dispatch
  // mouseenter/pointerenter bằng dispatchEvent thô, bỏ qua thuộc tính native
  // `disabled`, nên test này pass y hệt dù có span wrapper hay không. Regression
  // đó được test riêng bên dưới ("does not use the disabled button itself...").
  it('shows the "Sắp ra mắt" tooltip when hovering a disabled provider button', async () => {
    const user = userEvent.setup();
    render(<SocialLoginRow />);

    const google = screen.getByRole('button', { name: 'Đăng nhập với Google' });
    await user.hover(google);

    expect(await screen.findAllByText('Sắp ra mắt')).not.toHaveLength(0);
  });

  // Regression test thực sự cho fix Critical: Base UI's TooltipTrigger gắn
  // data-base-ui-tooltip-trigger="" lên chính DOM node mà nó render ra. Nếu ai
  // đó revert fix (đưa Button disabled làm trigger trực tiếp thay vì bọc
  // span), attribute này sẽ nằm trên <button> và test dưới đây FAIL — đã xác
  // nhận thực nghiệm bằng cách render cả 2 biến thể và so sánh container.innerHTML.
  it('does not use the disabled button itself as the tooltip trigger (span wrapper regression guard)', () => {
    const { container } = render(<SocialLoginRow />);

    const triggerButtons = container.querySelectorAll('button[data-base-ui-tooltip-trigger]');
    const triggerSpans = container.querySelectorAll('span[data-base-ui-tooltip-trigger]');

    expect(triggerButtons).toHaveLength(0);
    expect(triggerSpans).toHaveLength(3);
  });

  it('renders the default divider label', () => {
    render(<SocialLoginRow />);
    expect(screen.getByText('Hoặc tiếp tục với')).toBeInTheDocument();
  });

  it('renders a custom divider label when provided', () => {
    render(<SocialLoginRow label="Hoặc đăng ký nhanh với" />);
    expect(screen.getByText('Hoặc đăng ký nhanh với')).toBeInTheDocument();
  });
});
