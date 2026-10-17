import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompleteProfileForm } from './CompleteProfileForm';

vi.mock('@/services/auth.api', () => ({
  authApi: { checkUsername: vi.fn().mockResolvedValue({ available: true }) },
}));

describe('CompleteProfileForm', () => {
  it('điền sẵn tên hiển thị và báo lỗi khi thiếu username/ngày sinh', async () => {
    const onSubmit = vi.fn();
    render(<CompleteProfileForm prefill={{ email: 'a@b.com', displayName: 'Huy' }} isPending={false} onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Huy');
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tất' }));

    expect(await screen.findByText('Tên đăng nhập 3–50 ký tự')).toBeInTheDocument();
    expect(screen.getByText('Chọn ngày sinh')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
