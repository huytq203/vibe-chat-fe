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

  it('shows the "Sắp ra mắt" tooltip when hovering a disabled provider button', async () => {
    const user = userEvent.setup();
    render(<SocialLoginRow />);

    const google = screen.getByRole('button', { name: 'Đăng nhập với Google' });
    await user.hover(google);

    expect(await screen.findAllByText('Sắp ra mắt')).not.toHaveLength(0);
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
