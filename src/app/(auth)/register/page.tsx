import { redirect } from 'next/navigation';

// Halo đã bỏ mật khẩu: đăng ký/xác thực email/quên mật khẩu gộp vào /login.
export default function LegacyAuthPage(): never {
  redirect('/login');
}
