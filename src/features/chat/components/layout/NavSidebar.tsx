'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useNavUnread } from '@/features/chat/hooks/useNavUnread';
import type { NavSection } from '@/features/chat/stores/chat-ui.store';
import { useTaskActivityNotifications } from '@/features/tasks/hooks/useTaskActivityNotifications';
import { SettingsModal } from '@/features/settings';
import {
  NavPosition,
  useSettingsStore,
} from '@/features/settings/stores/settings.store';
import { DesktopNavDock } from './nav/DesktopNavDock';
import { MobileFloatingNav } from './nav/MobileFloatingNav';
import { getSectionBadge, NAV_ITEMS } from './nav/nav-items';

interface NavSidebarProps {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
}

interface DesktopVerticalNavProps extends NavSidebarProps {
  unreadTotal: number;
  taskUnreadCount: number;
  isRight: boolean;
}

const DESKTOP_ITEM_CLASS =
  'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors';

function DesktopVerticalNav({
  activeSection,
  onSectionChange,
  unreadTotal,
  taskUnreadCount,
  isRight,
}: DesktopVerticalNavProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Điều hướng chính"
        className={cn(
          'flex h-full w-14 shrink-0 flex-col items-center rounded-2xl border bg-sidebar px-0 py-3 shadow-subtle',
          isRight && 'order-last',
        )}
      >
        <div className="flex flex-none flex-col items-center justify-start gap-1">
          {NAV_ITEMS.filter((item) => item.section !== 'settings').map(
            ({ section, icon, label }) => {
              const isActive = activeSection === section;
              return (
                <button
                  key={section}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSectionChange(section)}
                  className={cn(
                    DESKTOP_ITEM_CLASS,
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {icon}
                  {getSectionBadge(section, unreadTotal, taskUnreadCount)}
                </button>
              );
            },
          )}
        </div>

        <button
          type="button"
          title="Cài đặt"
          aria-label="Cài đặt"
          onClick={() => setSettingsOpen(true)}
          className={cn(
            DESKTOP_ITEM_CLASS,
            'mt-auto',
            activeSection === 'settings'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Settings className="h-5 w-5" />
        </button>
      </nav>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

export function NavSidebar({ activeSection, onSectionChange }: NavSidebarProps) {
  const { total: unreadTotal } = useNavUnread();
  const { unreadCount: taskUnreadCount } = useTaskActivityNotifications();
  const isMobile = useIsMobile();
  const navPosition = useSettingsStore((state) => state.navPosition);
  const sharedProps = { activeSection, onSectionChange, unreadTotal, taskUnreadCount };

  if (isMobile) return <MobileFloatingNav {...sharedProps} />;
  if (navPosition === NavPosition.BOTTOM) return <DesktopNavDock {...sharedProps} />;

  return (
    <DesktopVerticalNav
      {...sharedProps}
      isRight={navPosition === NavPosition.RIGHT}
    />
  );
}
