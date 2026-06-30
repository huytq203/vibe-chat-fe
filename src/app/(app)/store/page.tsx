import { Suspense } from 'react';
import { AuthBootstrap } from '@/features/auth';
import { ChatLayout } from '@/features/chat';

export const metadata = { title: 'Kho của tôi' };

export default function StorePage() {
  return (
    <div className="h-full w-full">
      <AuthBootstrap requireAuth redirectTo="/login" />
      <Suspense fallback={null}>
        <ChatLayout />
      </Suspense>
    </div>
  );
}
