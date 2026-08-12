import { Suspense } from 'react';
import { AuthBootstrap } from '@/features/auth';
import { ChatLayout } from '@/features/chat';

/**
 * Khung chat dựng ở LAYOUT của segment `chat` — nằm TRÊN segment động `[id]`.
 *
 * App Router key mỗi segment theo giá trị param, nên nếu khung nằm trong page thì
 * `/chat/A` → `/chat/B` sẽ unmount + mount lại toàn bộ khung (sidebar, danh sách hội
 * thoại, socket, wallpaper…) → màn hình nháy như tải lại. Ở layout thì key giữ nguyên
 * là `chat`, khung sống xuyên suốt; chỉ `useParams().id` đổi để ChatPanel render lại.
 */
export default function ChatSectionLayout({
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
