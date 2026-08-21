'use client';

import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { Dock, DockIcon, DockSeparator } from '@/components/ui/dock/Dock';
import { SettingsModal } from '@/features/settings';
import type { NavSection } from '@/features/chat/stores/chat-ui.store';
import { cn } from '@/lib/utils/cn';
import { getSectionBadge, NAV_ITEMS } from './nav-items';

interface DesktopNavDockProps {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
  unreadTotal: number;
  taskUnreadCount: number;
}

const HIDE_DELAY_MS = 400;

export function DesktopNavDock({
  activeSection,
  onSectionChange,
  unreadTotal,
  taskUnreadCount,
}: DesktopNavDockProps) {
  const navRef = useRef<HTMLElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const clearHideTimer = () => {
    if (hideTimerRef.current === null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const showDock = () => {
    clearHideTimer();
    setIsVisible(true);
  };

  const hideDockSoon = () => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      if (!navRef.current?.contains(document.activeElement)) setIsVisible(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  };

  useEffect(() => () => clearHideTimer(), []);

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Điều hướng chính"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[150] flex justify-center"
        onPointerEnter={showDock}
        onPointerLeave={hideDockSoon}
        onFocusCapture={showDock}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) hideDockSoon();
        }}
      >
        <div
          aria-hidden="true"
          data-testid="desktop-dock-handle"
          className="pointer-events-auto absolute inset-x-0 bottom-0 flex h-3.5 items-end justify-center pb-1"
        >
          <span className="h-1.5 w-24 rounded-full bg-primary/70" />
        </div>

        <motion.div
          initial={false}
          animate={{ y: isVisible ? 0 : 64, opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          data-visible={isVisible}
          className={cn(isVisible ? 'pointer-events-auto' : 'pointer-events-none', 'pb-4')}
        >
          <Dock
            orientation="horizontal"
            aria-label="Các khu vực"
            iconSize={36}
            iconMagnification={48}
            iconDistance={110}
            className="gap-2 rounded-xl border-transparent bg-sidebar p-2 text-sidebar-foreground shadow-[0_10px_28px_rgba(0,0,0,0.32)] backdrop-blur-none"
          >
            {NAV_ITEMS.filter((item) => item.section !== 'settings').map(
              ({ section, icon, label }) => {
                const isActive = activeSection === section;
                return (
                  <DockIcon
                    key={section}
                    label={label}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onSectionChange(section)}
                    className={cn(
                      'relative bg-sidebar-accent text-sidebar-foreground hover:bg-primary/15 hover:text-accent-foreground',
                      isActive && 'bg-primary/25 text-foreground ring-1 ring-primary/50',
                    )}
                  >
                    {icon}
                    {getSectionBadge(section, unreadTotal, taskUnreadCount)}
                  </DockIcon>
                );
              },
            )}
            <DockSeparator className="bg-sidebar-border" />
            <DockIcon
              label="Cài đặt"
              aria-current={activeSection === 'settings' ? 'page' : undefined}
              onClick={() => setSettingsOpen(true)}
              className={cn(
                'relative bg-sidebar-accent text-sidebar-foreground hover:bg-primary/15 hover:text-foreground',
                activeSection === 'settings' &&
                  'bg-primary/25 text-foreground ring-1 ring-primary/50',
              )}
            >
              <Settings className="h-5 w-5" />
            </DockIcon>
          </Dock>
        </motion.div>
      </nav>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
