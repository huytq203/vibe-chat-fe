import { Suspense } from 'react';
import { AuthBootstrap } from '@/features/auth';
import { ChatLayout } from '@/features/chat';
import { WorkDeepLinkSync } from '@/features/tasks/components/layout/WorkDeepLinkSync';

export const metadata = { title: 'Halo Tasks' };

export default function WorkPage() {
  return (
    <div className="h-full w-full">
      <AuthBootstrap requireAuth redirectTo="/login" />
      <Suspense fallback={null}>
        <WorkDeepLinkSync />
        <ChatLayout />
      </Suspense>
    </div>
  );
}
