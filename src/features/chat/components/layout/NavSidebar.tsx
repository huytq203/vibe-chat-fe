'use client';

import { Archive, Bot, MessageSquare, SquareKanban } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { NavSection } from '@/features/chat/stores/chat-ui.store';
import { useNavUnread } from '@/features/chat/hooks/useNavUnread';

type Props = {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
};

type NavItem = {
  section: NavSection;
  icon: React.ReactNode;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { section: 'chat', icon: <MessageSquare className="h-5 w-5" />, label: 'Chat' },
  { section: 'ai-full', icon: <Bot className="h-5 w-5" />, label: 'AI Chat' },
  { section: 'tasks', icon: <SquareKanban className="h-5 w-5" />, label: 'Tasks' },
  { section: 'store', icon: <Archive className="h-5 w-5" />, label: 'Kho của tôi' },
];

const ITEM_CLASS = 'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors';

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function NavSidebar({ activeSection, onSectionChange }: Props) {
  const { total: unreadTotal } = useNavUnread();

  return (
    <nav className="flex h-full w-14 shrink-0 flex-col items-center rounded-2xl bg-sidebar py-3 shadow-subtle border">
      {/* Main navigation icons */}
      <div className="flex flex-col items-center gap-1">
        {NAV_ITEMS.map(({ section, icon, label }) => {
          // Panel AI trong chat (section 'ai') vẫn thuộc khu vực Chat → giữ icon Chat sáng.
          const isActive = section === 'chat' ? activeSection === 'chat' || activeSection === 'ai' : activeSection === section;
          return (
          <button
            key={section}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => onSectionChange(section)}
            className={cn(
              ITEM_CLASS,
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {icon}
            {section === 'chat' && <UnreadBadge count={unreadTotal} />}
          </button>
          );
        })}
      </div>
    </nav>
  );
}
