import { Suspense } from 'react';
import { AuthBootstrap } from '@/features/auth';
import { ChatLayout } from '@/features/chat';

/**
 * Khung AI dựng ở LAYOUT của segment `ai` — nằm TRÊN segment động `[id]`, cùng lý do
 * như `chat/layout.tsx`: giữ khung sống khi đổi phiên `/ai/A` → `/ai/B` để không nháy.
 */
export default function AiSectionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-full w-full">
      <AuthBootstrap requireAuth redirectTo="/login" />
      <Suspense fallback={null}>
        <ChatLayout />
      </Suspense>
      {children}
    </div>
  );
}
