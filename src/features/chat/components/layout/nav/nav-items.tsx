import { Archive, Bot, MessageSquare, Settings, SquareKanban } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NavSection } from '@/features/chat/stores/chat-ui.store';

interface NavItem {
  section: NavSection;
  icon: ReactNode;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { section: 'chat', icon: <MessageSquare className="h-5 w-5" />, label: 'Chat' },
  { section: 'ai-full', icon: <Bot className="h-5 w-5" />, label: 'AI Chat' },
  { section: 'tasks', icon: <SquareKanban className="h-5 w-5" />, label: 'Tasks' },
  { section: 'store', icon: <Archive className="h-5 w-5" />, label: 'Kho của tôi' },
  { section: 'settings', icon: <Settings className="h-5 w-5" />, label: 'Cài đặt' },
];

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function getSectionBadge(
  section: NavSection,
  unreadTotal: number,
  taskUnreadCount: number,
) {
  if (section === 'chat') return <UnreadBadge count={unreadTotal} />;
  if (section === 'tasks') return <UnreadBadge count={taskUnreadCount} />;
  return null;
}
