import { RegisterForm, AuthBootstrap } from '@/features/auth';

export const metadata = { title: 'Đăng ký · Halo' };

export default function RegisterPage() {
  return (
    <>
      <AuthBootstrap redirectIfAuthed="/chat" />
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <RegisterForm />
      </main>
    </>
  );
}
