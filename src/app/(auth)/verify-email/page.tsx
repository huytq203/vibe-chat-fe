import { Suspense } from 'react';
import { AuthBootstrap, VerifyEmailForm } from '@/features/auth';

export const metadata = { title: 'Xác thực email · Halo' };

export default function VerifyEmailPage() {
  return (
    <>
      <AuthBootstrap />
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Suspense fallback={null}>
          <VerifyEmailForm />
        </Suspense>
      </main>
    </>
  );
}
