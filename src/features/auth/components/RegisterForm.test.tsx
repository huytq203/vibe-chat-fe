import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from './RegisterForm';
import { ApiError } from '@/lib/api/client';

vi.mock('@/config/env', () => ({
  env: {
    NEXT_PUBLIC_AUTH_URL: 'http://test',
    NEXT_PUBLIC_VIBE_URL: 'http://test',
    NEXT_PUBLIC_WS_URL: 'http://test',
    NEXT_PUBLIC_CALL_WS_URL: 'http://test',
    NEXT_PUBLIC_USE_PROXY: true,
  },
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const mutateAsync = vi.fn();
vi.mock('@/features/auth/hooks/use-mutations', () => ({
  useRegister: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

async function fillStep1() {
  await userEvent.type(screen.getByLabelText('Tên hiển thị'), 'Nguyễn Văn A');
  await userEvent.type(screen.getByLabelText('Tên đăng nhập'), 'nguyenvana');
  await userEvent.click(screen.getByRole('button', { name: /tiếp theo/i }));
}

async function fillStep2() {
  await userEvent.type(screen.getByLabelText('Email'), 'a@example.com');
  await userEvent.type(screen.getByLabelText('Số điện thoại'), '0901234567');
  await userEvent.click(screen.getByRole('button', { name: /tiếp theo/i }));
}

async function fillStep3() {
  // DatePicker (editable) nhận định dạng dd/MM/yyyy và tự chuyển về yyyy-MM-dd cho form.
  fireEvent.change(screen.getByPlaceholderText('Chọn ngày sinh'), {
    target: { value: '15/01/2000' },
  });
  await userEvent.click(screen.getByRole('button', { name: /tiếp theo/i }));
}

async function fillStep4() {
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Secret123');
  await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu'), 'Secret123');
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }));
}

describe('RegisterForm (multi-step)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chặn sang bước 2 khi bước 1 chưa hợp lệ', async () => {
    render(<RegisterForm />);
    await userEvent.click(screen.getByRole('button', { name: /tiếp theo/i }));
    expect(await screen.findByText('Tên hiển thị tối thiểu 2 ký tự')).toBeTruthy();
    // Vẫn ở bước 1
    expect(screen.getByText('Tạo danh tính')).toBeTruthy();
  });

  it('đi hết 4 bước và submit payload không chứa field client-side', async () => {
    mutateAsync.mockResolvedValue({ message: 'ok', email: 'a@example.com' });
    render(<RegisterForm />);

    await fillStep1();
    // Bước 2 hiện preview avatar với @username
    expect(await screen.findByText('@nguyenvana')).toBeTruthy();
    await fillStep2();
    expect(await screen.findByText(/xác minh bạn đủ tuổi/i)).toBeTruthy();
    await fillStep3();
    expect(await screen.findByText('Đặt mật khẩu')).toBeTruthy();
    await fillStep4();

    expect(mutateAsync).toHaveBeenCalledWith({
      username: 'nguyenvana',
      email: 'a@example.com',
      phone: '0901234567',
      dateOfBirth: '2000-01-15',
      displayName: 'Nguyễn Văn A',
      password: 'Secret123',
    });
    expect(push).toHaveBeenCalledWith('/verify-email?email=a%40example.com');
  });

  it('lỗi trùng email từ BE → nhảy về bước Liên lạc kèm message', async () => {
    mutateAsync.mockRejectedValue(new ApiError(409, 'USER_EMAIL_TAKEN', 'Email đã được sử dụng'));
    render(<RegisterForm />);

    await fillStep1();
    await fillStep2();
    await fillStep3();
    await fillStep4();

    // Quay lại bước 2 với lỗi gắn vào field email
    expect(await screen.findByText('Email đã được sử dụng')).toBeTruthy();
    expect(screen.getByText('Thông tin liên lạc')).toBeTruthy();
  });
});
