import { LoginForm, AuthBootstrap } from '@/features/auth';
import { AuthShowcaseLayout } from '@/components/layout/AuthShowcaseLayout';

export const metadata = { title: 'Đăng nhập · Halo' };

export default function LoginPage() {
  return (
    <>
      <AuthBootstrap redirectIfAuthed="/chat" />
      <AuthShowcaseLayout>
        <LoginForm />
      </AuthShowcaseLayout>
    </>
  );
}
