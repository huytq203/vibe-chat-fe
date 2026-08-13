'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useDragControls, useMotionValue } from 'motion/react';
import { Archive, Bot, MessageSquare, Settings, SquareKanban, X } from 'lucide-react';
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
  { section: 'settings', icon: <Settings className="h-5 w-5" />, label: 'Cài đặt' },
];

const DESKTOP_ITEM_CLASS =
  'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors';
const MOBILE_HUB_SIZE = 58;
const MOBILE_ITEM_SIZE = 48;
const MOBILE_RING_RADIUS = 84;
const MOBILE_RING_EXTENT = MOBILE_RING_RADIUS + MOBILE_ITEM_SIZE / 2 + 4;

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
      {count > 9 ? '9+' : count}
    </span>
  );
}

function getSectionBadge(section: NavSection, unreadTotal: number, taskUnreadCount: number) {
  if (section === 'chat') return <UnreadBadge count={unreadTotal} />;
  if (section === 'tasks') return <UnreadBadge count={taskUnreadCount} />;
  return null;
}

function MobileFloatingNav({
  activeSection,
  onSectionChange,
  unreadTotal,
  taskUnreadCount,
}: Props & { unreadTotal: number; taskUnreadCount: number }) {
  const boundsRef = useRef<HTMLElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);

  useEffect(() => {
    const bounds = boundsRef.current;
    if (!bounds) return;

    const placeAtDefault = () => {
      x.set(Math.max(0, bounds.clientWidth - MOBILE_HUB_SIZE));
      y.set(Math.max(0, bounds.clientHeight - MOBILE_HUB_SIZE));
      setIsPositioned(true);
    };

    placeAtDefault();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(placeAtDefault);
      observer.observe(bounds);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', placeAtDefault);
    return () => window.removeEventListener('resize', placeAtDefault);
  }, [x, y]);

  const moveHubInsideRing = () => {
    const bounds = boundsRef.current?.getBoundingClientRect();
    const hub = hubRef.current?.getBoundingClientRect();
    if (!bounds || !hub || bounds.width <= 0 || bounds.height <= 0) return;

    const centerX = hub.left - bounds.left + hub.width / 2;
    const centerY = hub.top - bounds.top + hub.height / 2;
    const horizontalExtent = Math.min(MOBILE_RING_EXTENT, bounds.width / 2);
    const verticalExtent = Math.min(MOBILE_RING_EXTENT, bounds.height / 2);
    const targetCenterX = Math.min(
      Math.max(centerX, horizontalExtent),
      bounds.width - horizontalExtent,
    );
    const targetCenterY = Math.min(
      Math.max(centerY, verticalExtent),
      bounds.height - verticalExtent,
    );

    const spring = { type: 'spring' as const, stiffness: 430, damping: 34, mass: 0.7 };
    animate(x, x.get() + targetCenterX - centerX, spring);
    animate(y, y.get() + targetCenterY - centerY, spring);
  };

  const toggleMenu = () => {
    if (didDragRef.current) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    moveHubInsideRing();
    setIsOpen(true);
  };

  const selectSection = (section: NavSection) => {
    setIsOpen(false);
    onSectionChange(section);
  };

  const activeItem = NAV_ITEMS.find((item) => item.section === activeSection) ?? NAV_ITEMS[0];

  return (
    <nav
      ref={boundsRef}
      aria-label="Điều hướng chính"
      className="pointer-events-none fixed z-[150]"
      style={{
        top: 'max(12px, env(safe-area-inset-top))',
        right: 'max(12px, env(safe-area-inset-right))',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: 'max(12px, env(safe-area-inset-left))',
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.button
            type="button"
            aria-label="Đóng menu khi chạm bên ngoài"
            className="pointer-events-auto fixed inset-0 bg-background/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={hubRef}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={boundsRef}
        dragElastic={0.08}
        dragMomentum={false}
        style={{ x, y }}
        className={cn(
          'pointer-events-auto absolute left-0 top-0 h-[58px] w-[58px] touch-none',
          !isPositioned && 'opacity-0',
        )}
        whileDrag={{ scale: 1.07 }}
        onDragStart={() => {
          didDragRef.current = true;
          setIsOpen(false);
        }}
        onDragEnd={() => {
          window.setTimeout(() => {
            didDragRef.current = false;
          }, 0);
        }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id="mobile-radial-navigation"
              role="group"
              aria-label="Các khu vực"
              className="absolute left-1/2 top-1/2 h-0 w-0"
              initial="closed"
              animate="open"
              exit="closed"
            >
              {NAV_ITEMS.map(({ section, icon, label }, index) => {
                const angle = (-90 + index * (360 / NAV_ITEMS.length)) * (Math.PI / 180);
                const itemX = Math.cos(angle) * MOBILE_RING_RADIUS;
                const itemY = Math.sin(angle) * MOBILE_RING_RADIUS;
                const isActive = activeSection === section;

                return (
                  <motion.button
                    key={section}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => selectSection(section)}
                    className={cn(
                      'absolute -left-6 -top-6 flex h-12 w-12 items-center justify-center rounded-full outline-none shadow-[0_10px_28px_rgba(0,0,0,0.34)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-sidebar-border bg-sidebar text-sidebar-foreground',
                    )}
                    variants={{
                      closed: { x: 0, y: 0, opacity: 0, scale: 0.35, filter: 'blur(4px)' },
                      open: { x: itemX, y: itemY, opacity: 1, scale: 1, filter: 'blur(0px)' },
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 470,
                      damping: 29,
                      delay: index * 0.035,
                    }}
                    whileTap={{ scale: 0.88 }}
                  >
                    {icon}
                    {getSectionBadge(section, unreadTotal, taskUnreadCount)}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          title={isOpen ? 'Đóng menu' : `${activeItem.label} · Kéo để di chuyển`}
          aria-label={isOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng. Kéo để di chuyển'}
          aria-expanded={isOpen}
          aria-controls="mobile-radial-navigation"
          onPointerDown={(event) => dragControls.start(event)}
          onClick={toggleMenu}
          className="relative z-10 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-primary text-primary-foreground outline-none shadow-[0_14px_36px_rgba(0,0,0,0.42)] ring-1 ring-white/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          animate={{ rotate: isOpen ? 90 : 0, scale: isOpen ? 1.04 : 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          whileTap={{ scale: 0.92 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isOpen ? 'close' : activeItem.section}
              className="flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            >
              {isOpen ? <X className="h-6 w-6" /> : activeItem.icon}
            </motion.span>
          </AnimatePresence>
          {!isOpen && getSectionBadge(activeSection, unreadTotal, taskUnreadCount)}
          {!isOpen && (
            <span className="absolute bottom-1.5 flex gap-0.5" aria-hidden="true">
              <span className="h-0.5 w-0.5 rounded-full bg-primary-foreground/70" />
              <span className="h-0.5 w-0.5 rounded-full bg-primary-foreground/70" />
              <span className="h-0.5 w-0.5 rounded-full bg-primary-foreground/70" />
            </span>
          )}
        </motion.button>
      </motion.div>
    </nav>
  );
}

export function NavSidebar({ activeSection, onSectionChange }: Props) {
  const { total: unreadTotal } = useNavUnread();
  const { unreadCount: taskUnreadCount } = useTaskActivityNotifications();
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (isMobile) {
    return (
      <MobileFloatingNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        unreadTotal={unreadTotal}
        taskUnreadCount={taskUnreadCount}
      />
    );
  }

  return (
    <>
      <nav
        aria-label="Điều hướng chính"
        className="flex h-full w-14 shrink-0 flex-col items-center rounded-2xl border bg-sidebar px-0 py-3 shadow-subtle"
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
