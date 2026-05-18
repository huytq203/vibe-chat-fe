import { LoginForm, AuthBootstrap } from '@/features/auth';

export const metadata = { title: 'Đăng nhập · Vibe Chat' };

export default function LoginPage() {
  return (
    <>
      <AuthBootstrap />
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <LoginForm />
      </main>
    </>
  );
}
