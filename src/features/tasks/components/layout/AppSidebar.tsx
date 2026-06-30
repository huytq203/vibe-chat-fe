'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react';
import { Home, LayoutGrid, Columns3, BarChart3 } from 'lucide-react';
import { Dock, DockIcon } from '@/components/ui/dock/Dock';
import { cn } from '@/lib/utils/cn';
import type { ActiveView } from '../../stores/tasks-ui.store';

interface AppSidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}

const NAV_ITEMS: { view: ActiveView; label: string; Icon: typeof Home }[] = [
  { view: 'home', label: 'Trang chủ', Icon: Home },
  { view: 'projects', label: 'Dự án', Icon: LayoutGrid },
  { view: 'board', label: 'Nhiệm vụ', Icon: Columns3 },
  { view: 'reports', label: 'Báo cáo', Icon: BarChart3 },
];

const DRAG_THRESHOLD = 4; // px — vượt ngưỡng coi là kéo, không tính click
const EDGE_MARGIN = 24; // px — khoảng cách FAB tới rìa (khớp bottom-6/right-6)
const SNAP_SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const [open, setOpen] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const wasDragged = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleNavigate = (view: ActiveView) => {
    onNavigate(view);
    setOpen(false);
  };

  const handleFabClick = () => {
    if (wasDragged.current) {
      wasDragged.current = false; // bỏ qua click sinh ra sau khi kéo
      return;
    }
    setOpen((v) => !v);
  };

  // Thả tay → trượt về cạnh trái/phải gần nhất (giữ nguyên vị trí dọc).
  const snapToEdge = () => {
    const container = constraintsRef.current;
    const btn = fabRef.current;
    if (!container || !btn) return;
    const c = container.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const isLeftHalf = b.left + b.width / 2 < c.left + c.width / 2;
    const currentX = x.get();
    const target = isLeftHalf
      ? currentX + (c.left + EDGE_MARGIN - b.left)
      : currentX + (c.right - EDGE_MARGIN - b.right);
    void animate(x, target, SNAP_SPRING);
  };

  return (
    // Lớp phủ định cữ kéo (= khung làm việc). pointer-events-none để không chặn nội dung;
    // chỉ FAB/dock bên trong bật lại pointer-events.
    <div ref={constraintsRef} className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 bottom-4 flex justify-center"
          >
            <Dock
              orientation="horizontal"
              iconSize={36}
              iconMagnification={50}
              className="pointer-events-auto gap-2 rounded-xl border-border/60 bg-sidebar/85 p-2 shadow-2xl shadow-black/40"
            >
              {NAV_ITEMS.map(({ view, label, Icon }) => (
                <DockIcon
                  key={view}
                  label={label}
                  aria-label={label}
                  onClick={() => handleNavigate(view)}
                  className={cn(
                    'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                    activeView === view && 'bg-primary/15 text-primary',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </DockIcon>
              ))}
            </Dock>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nút home ảo — kéo tự do trong khung, thả ra tự trượt về rìa gần nhất. */}
      <motion.button
        ref={fabRef}
        type="button"
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.12}
        dragMomentum={false}
        style={{ x, y }}
        onDrag={(_, info) => {
          if (Math.abs(info.offset.x) > DRAG_THRESHOLD || Math.abs(info.offset.y) > DRAG_THRESHOLD) {
            wasDragged.current = true;
          }
        }}
        onDragEnd={snapToEdge}
        onClick={handleFabClick}
        whileTap={{ scale: 0.92 }}
        whileDrag={{ scale: 1.05 }}
        aria-label={open ? 'Đóng thanh điều hướng' : 'Mở thanh điều hướng'}
        aria-expanded={open}
        className="pointer-events-auto absolute bottom-6 right-6 grid h-12 w-12 cursor-grab touch-none place-items-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-black/40 ring-1 ring-white/20 active:cursor-grabbing"
      >
        <Home className="h-5 w-5" />
      </motion.button>
    </div>
  );
}
