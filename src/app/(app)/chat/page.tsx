import { AuthBootstrap } from '@/features/auth';
import LeftContent from '@/features/chat/components/Left-content';

export const metadata = { title: 'Vibe Chat' };

export default function ChatPage() {
  return (
    <div className="flex h-full">
      <AuthBootstrap />
      <LeftContent />
    </div>
  );
}
