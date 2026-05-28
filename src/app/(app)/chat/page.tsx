import { Suspense } from 'react';
import { AuthBootstrap } from '@/features/auth';
import { ChatLayout } from '@/features/chat';

export const metadata = { title: 'Vibe Chat' };

export default function ChatPage() {
  return (
    <div className="h-full w-full">
      <AuthBootstrap requireAuth redirectTo="/login" />
      <Suspense fallback={null}>
        <ChatLayout />
      </Suspense>
    </div>
  );
}
