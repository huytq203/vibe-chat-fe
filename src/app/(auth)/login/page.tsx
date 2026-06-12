import { LoginForm, AuthBootstrap } from '@/features/auth';

export const metadata = { title: 'Đăng nhập · Halo' };

export default function LoginPage() {
  return (
    <>
      <AuthBootstrap redirectIfAuthed="/chat" />
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <LoginForm />
      </main>
    </>
  );
}
