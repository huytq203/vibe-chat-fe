'use client';

import { Bot, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { NavSection } from '@/features/chat/stores/chat-ui.store';

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
];

export function NavSidebar({ activeSection, onSectionChange }: Props) {
  return (
    <nav className="flex h-full w-14 shrink-0 flex-col items-center border-r border-border bg-sidebar py-3">
      {/* Top: main navigation icons */}
      <div className="flex flex-1 flex-col items-center gap-1">
        {NAV_ITEMS.map(({ section, icon, label }) => (
          <button
            key={section}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => onSectionChange(section)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
              activeSection === section
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {icon}
          </button>
        ))}
      </div>

      
    </nav>
  );
}
