'use client';

import { useState } from 'react';
import { Archive, Bot, MessageSquare, Settings, SquareKanban } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { NavSection } from '@/features/chat/stores/chat-ui.store';
import { useNavUnread } from '@/features/chat/hooks/useNavUnread';
import { useTaskActivityNotifications } from '@/features/tasks/hooks/useTaskActivityNotifications';
import { SettingsModal } from '@/features/settings';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

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

const ITEM_CLASS =
  'relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors md:h-10 md:w-10';

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
  const { unreadCount: taskUnreadCount } = useTaskActivityNotifications();
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Điều hướng chính"
        className="flex h-14 w-full shrink-0 items-center border-t bg-sidebar px-2 md:h-full md:w-14 md:flex-col md:rounded-2xl md:border md:px-0 md:py-3 md:shadow-subtle"
      >
        {/* Main navigation icons */}
        <div className="flex flex-1 items-center justify-around md:flex-none md:flex-col md:justify-start md:gap-1">
          {NAV_ITEMS.map(({ section, icon, label }) => {
            const isActive = activeSection === section;
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
                {section === 'tasks' && <UnreadBadge count={taskUnreadCount} />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          title="Cài đặt"
          aria-label="Cài đặt"
          onClick={() => {
            if (isMobile) onSectionChange('settings');
            else setSettingsOpen(true);
          }}
          className={cn(
            ITEM_CLASS,
            activeSection === 'settings'
              ? 'ml-1 bg-primary/15 text-primary md:ml-0 md:mt-auto'
              : 'ml-1 text-muted-foreground hover:bg-muted hover:text-foreground md:ml-0 md:mt-auto',
          )}
        >
          <Settings className="h-5 w-5" />
        </button>
      </nav>

      {!isMobile && <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </>
  );
}
