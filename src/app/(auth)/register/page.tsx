import { RegisterForm, AuthBootstrap } from '@/features/auth';
import { AuthShowcaseLayout } from '@/components/layout/AuthShowcaseLayout';

export const metadata = { title: 'Đăng ký · Halo' };

export default function RegisterPage() {
  return (
    <>
      <AuthBootstrap redirectIfAuthed="/chat" />
      <AuthShowcaseLayout>
        <RegisterForm />
      </AuthShowcaseLayout>
    </>
  );
}
