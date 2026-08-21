'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useDragControls, useMotionValue } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { NavSection } from '@/features/chat/stores/chat-ui.store';
import { getSectionBadge, NAV_ITEMS } from './nav-items';
interface MobileFloatingNavProps {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
  unreadTotal: number;
  taskUnreadCount: number;
}
export type MobileDockEdge = 'top' | 'right' | 'bottom' | 'left';
const MOBILE_HUB_SIZE = 58;
const MOBILE_ITEM_SIZE = 48;
const MOBILE_RING_RADIUS = 84;
const MOBILE_RING_EXTENT = MOBILE_RING_RADIUS + MOBILE_ITEM_SIZE / 2 + 4;
const EDGE_SPRING = { type: 'spring' as const, stiffness: 460, damping: 36, mass: 0.72 };
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
export function getNearestMobileDockEdge(
  x: number,
  y: number,
  maxX: number,
  maxY: number,
): MobileDockEdge {
  const distances: Array<[MobileDockEdge, number]> = [
    ['left', Math.max(0, x)],
    ['right', Math.max(0, maxX - x)],
    ['top', Math.max(0, y)],
    ['bottom', Math.max(0, maxY - y)],
  ];
  return distances.reduce((nearest, candidate) =>
    candidate[1] < nearest[1] ? candidate : nearest,
  )[0];
}
export function getMobileRadialOffset(
  edge: MobileDockEdge,
  index: number,
  total: number,
  radius = MOBILE_RING_RADIUS,
) {
  const startAngle = { left: -90, right: 90, top: 0, bottom: 180 }[edge];
  const progress = total <= 1 ? 0.5 : index / (total - 1);
  const angle = (startAngle + progress * 180) * (Math.PI / 180);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
export function MobileFloatingNav({
  activeSection,
  onSectionChange,
  unreadTotal,
  taskUnreadCount,
}: MobileFloatingNavProps) {
  const boundsRef = useRef<HTMLElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const didPositionRef = useRef(false);
  const dockEdgeRef = useRef<MobileDockEdge>('right');
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [dockEdge, setDockEdge] = useState<MobileDockEdge>('right');

  useEffect(() => {
    const bounds = boundsRef.current;
    if (!bounds) return;
    const alignWithEdge = () => {
      const maxX = Math.max(0, bounds.clientWidth - MOBILE_HUB_SIZE);
      const maxY = Math.max(0, bounds.clientHeight - MOBILE_HUB_SIZE);
      if (!didPositionRef.current) {
        x.set(maxX);
        y.set(clamp(bounds.clientHeight * 0.68 - MOBILE_HUB_SIZE / 2, 0, maxY));
        didPositionRef.current = true;
      } else {
        const edge = dockEdgeRef.current;
        x.set(edge === 'left' ? 0 : edge === 'right' ? maxX : clamp(x.get(), 0, maxX));
        y.set(edge === 'top' ? 0 : edge === 'bottom' ? maxY : clamp(y.get(), 0, maxY));
      }
      setIsPositioned(true);
    };
    alignWithEdge();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(alignWithEdge);
      observer.observe(bounds);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', alignWithEdge);
    return () => window.removeEventListener('resize', alignWithEdge);
  }, [x, y]);
  const snapToEdge = (edge: MobileDockEdge, makeRoomForMenu = false) => {
    const bounds = boundsRef.current;
    if (!bounds) return;
    const maxX = Math.max(0, bounds.clientWidth - MOBILE_HUB_SIZE);
    const maxY = Math.max(0, bounds.clientHeight - MOBILE_HUB_SIZE);
    let targetX = clamp(x.get(), 0, maxX);
    let targetY = clamp(y.get(), 0, maxY);

    if (edge === 'left') targetX = 0;
    if (edge === 'right') targetX = maxX;
    if (edge === 'top') targetY = 0;
    if (edge === 'bottom') targetY = maxY;
    if (makeRoomForMenu) {
      if (edge === 'left' || edge === 'right') {
        const centerY = clamp(
          targetY + MOBILE_HUB_SIZE / 2,
          MOBILE_RING_EXTENT,
          bounds.clientHeight - MOBILE_RING_EXTENT,
        );
        targetY = centerY - MOBILE_HUB_SIZE / 2;
      } else {
        const centerX = clamp(
          targetX + MOBILE_HUB_SIZE / 2,
          MOBILE_RING_EXTENT,
          bounds.clientWidth - MOBILE_RING_EXTENT,
        );
        targetX = centerX - MOBILE_HUB_SIZE / 2;
      }
    }

    dockEdgeRef.current = edge;
    setDockEdge(edge);
    animate(x, targetX, EDGE_SPRING);
    animate(y, targetY, EDGE_SPRING);
  };
  const toggleMenu = () => {
    if (didDragRef.current) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    snapToEdge(dockEdgeRef.current, true);
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
        top: 'env(safe-area-inset-top, 0px)',
        right: 'env(safe-area-inset-right, 0px)',
        bottom: 'max(4px, min(env(safe-area-inset-bottom, 0px), 12px))',
        left: 'env(safe-area-inset-left, 0px)',
      }}
      data-dock-edge={dockEdge}
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
          const bounds = boundsRef.current;
          if (bounds) {
            const maxX = Math.max(0, bounds.clientWidth - MOBILE_HUB_SIZE);
            const maxY = Math.max(0, bounds.clientHeight - MOBILE_HUB_SIZE);
            snapToEdge(getNearestMobileDockEdge(x.get(), y.get(), maxX, maxY));
          }
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
              data-radial-direction={dockEdge}
              initial="closed"
              animate="open"
              exit="closed"
            >
              {NAV_ITEMS.map(({ section, icon, label }, index) => {
                const { x: itemX, y: itemY } = getMobileRadialOffset(
                  dockEdge,
                  index,
                  NAV_ITEMS.length,
                );
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
