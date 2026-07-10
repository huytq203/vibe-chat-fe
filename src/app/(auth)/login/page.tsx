import { LoginForm, AuthBootstrap } from '@/features/auth';
import { LoginPageShell } from './_components/LoginPageShell';

export const metadata = { title: 'Đăng nhập · Halo' };

export default function LoginPage() {
  return (
    <>
      <AuthBootstrap redirectIfAuthed="/chat" />
      <LoginPageShell>
        <LoginForm />
      </LoginPageShell>
    </>
  );
}
