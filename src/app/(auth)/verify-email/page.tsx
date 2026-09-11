import { Suspense } from 'react';
import { AuthBootstrap, VerifyEmailForm } from '@/features/auth';

export const metadata = { title: 'Xác thực email · Halo' };

export default function VerifyEmailPage() {
  return (
    <>
      <AuthBootstrap />
      <main className="flex h-full items-center justify-center overflow-y-auto bg-background px-4 pt-[calc(var(--safe-top)+1rem)] pb-[max(var(--safe-bottom),1rem)]">
        <Suspense fallback={null}>
          <VerifyEmailForm />
        </Suspense>
      </main>
    </>
  );
}
