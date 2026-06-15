import { AuthBootstrap, ForgotPasswordForm } from '@/features/auth';

export const metadata = { title: 'Quên mật khẩu · Halo' };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthBootstrap redirectIfAuthed="/chat" />
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <ForgotPasswordForm />
      </main>
    </>
  );
}
