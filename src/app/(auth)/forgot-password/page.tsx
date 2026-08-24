import { AuthBootstrap, ForgotPasswordForm } from '@/features/auth';

export const metadata = { title: 'Quên mật khẩu · Halo' };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthBootstrap redirectIfAuthed="/chat" />
      <main className="flex h-full items-center justify-center overflow-y-auto bg-background px-4 pt-[calc(var(--safe-top)+1rem)] pb-[calc(var(--safe-bottom)+1rem)]">
        <ForgotPasswordForm />
      </main>
    </>
  );
}
