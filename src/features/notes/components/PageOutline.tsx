'use client';

import { ListTree } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button/Button';
import type { OutlineItem } from '@/lib/editor/heading-outline';
import { cn } from '@/lib/utils/cn';

const OPEN_INDENT_CLASS = [
  'group-hover/outline:pl-2 group-has-[:focus-visible]/outline:pl-2',
  'group-hover/outline:pl-4 group-has-[:focus-visible]/outline:pl-4',
  'group-hover/outline:pl-6 group-has-[:focus-visible]/outline:pl-6',
  'group-hover/outline:pl-8 group-has-[:focus-visible]/outline:pl-8',
  'group-hover/outline:pl-10 group-has-[:focus-visible]/outline:pl-10',
  'group-hover/outline:pl-12 group-has-[:focus-visible]/outline:pl-12',
] as const;
const MARKER_WIDTH_CLASS = ['w-5', 'w-4', 'w-3', 'w-2.5', 'w-2', 'w-1.5'] as const;

interface PageOutlineProps {
  items: OutlineItem[];
}

interface OutlineButtonProps {
  headerHeight: number;
  isActive: boolean;
  item: OutlineItem;
}

function findHeadingElement(id: string): HTMLElement | null {
  const editor = document.querySelector<HTMLElement>('.notes-editor');
  if (!editor) return null;

  const match = /^heading-(\d+)$/.exec(id);
  if (!match) return null;
  const index = Number(match[1]);
  return editor.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6').item(index);
}

function navigateToHeading(id: string, headerHeight: number): void {
  const target = findHeadingElement(id);
  if (!target) return;
  const main = target.closest<HTMLElement>('main') ?? document.querySelector<HTMLElement>('main');
  if (!main) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const top = target.getBoundingClientRect().top - main.getBoundingClientRect().top
    + main.scrollTop - headerHeight - 8;
  main.scrollTo({ behavior: prefersReducedMotion ? 'auto' : 'smooth', top });
}

function getLevelIndex(level: number): number {
  return Number.isInteger(level) && level >= 1 && level <= 6 ? level - 1 : 0;
}

function useHeaderHeight(): number {
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('main');
    const header = main?.querySelector<HTMLElement>('header');
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return headerHeight;
}

function useActiveHeading(items: OutlineItem[], headerHeight: number): string | undefined {
  const [observedActiveId, setObservedActiveId] = useState<string>();

  useEffect(() => {
    if (items.length === 0) return;
    const visibleIds = new Set<string>();
    const targets = new Map<Element, string>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = targets.get(entry.target);
        if (!id) continue;
        if (entry.isIntersecting) visibleIds.add(id);
        else visibleIds.delete(id);
      }
      const activeItem = items.find((item) => visibleIds.has(item.id));
      if (activeItem) setObservedActiveId(activeItem.id);
    }, {
      root: document.querySelector('main'),
      rootMargin: `-${headerHeight}px 0px 0px 0px`,
    });

    for (const item of items) {
      const target = findHeadingElement(item.id);
      if (!target) continue;
      targets.set(target, item.id);
      observer.observe(target);
    }
    return () => observer.disconnect();
  }, [headerHeight, items]);

  return observedActiveId && items.some((item) => item.id === observedActiveId)
    ? observedActiveId
    : items[0]?.id;
}

function OutlineButton({ headerHeight, isActive, item }: OutlineButtonProps) {
  const levelIndex = getLevelIndex(item.level);

  return (
    <Button
      aria-current={isActive ? 'location' : undefined}
      aria-label={item.text}
      className={cn(
        'h-4 w-full justify-start rounded-lg p-0 text-left text-[13px] font-normal leading-5 text-muted-foreground transition-[height,padding,background-color,color] duration-200 ease-out hover:text-foreground focus-visible:ring-offset-0 group-hover/outline:h-9 group-hover/outline:pr-2 group-has-[:focus-visible]/outline:h-9 group-has-[:focus-visible]/outline:pr-2 aria-[current=location]:text-primary group-hover/outline:aria-[current=location]:bg-primary/10 group-has-[:focus-visible]/outline:aria-[current=location]:bg-primary/10 motion-reduce:transition-none [&>div]:w-full',
        OPEN_INDENT_CLASS[levelIndex],
      )}
      size="xs"
      variant="ghost"
      onClick={(event) => {
        navigateToHeading(item.id, headerHeight);
        event.currentTarget.blur();
      }}
    >
      <span
        aria-hidden="true"
        className="flex w-6 shrink-0 items-center justify-center group-hover/outline:hidden group-has-[:focus-visible]/outline:hidden"
        data-outline-marker-rail
      >
        <span
          className={cn('h-0.5 rounded-full bg-current', MARKER_WIDTH_CLASS[levelIndex])}
          data-outline-marker
        />
      </span>
      <span aria-hidden="true" className="hidden min-w-0 truncate group-hover/outline:block group-has-[:focus-visible]/outline:block">
        {item.text}
      </span>
    </Button>
  );
}

export function PageOutline({ items }: PageOutlineProps) {
  const headerHeight = useHeaderHeight();
  const activeId = useActiveHeading(items, headerHeight);
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Mục lục"
      className="group/outline absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 md:block "
    >
      <div
        className="max-h-[calc(100vh-8rem)] w-9 overflow-y-auto overflow-x-hidden rounded-2xl border border-border/60 bg-popover/90 p-1.5 shadow-subtle transition-[width,padding,background-color,box-shadow] duration-200 ease-out group-hover/outline:w-72 group-hover/outline:p-2 group-hover/outline:bg-popover group-hover/outline:shadow-md group-has-[:focus-visible]/outline:w-72 group-has-[:focus-visible]/outline:p-2 group-has-[:focus-visible]/outline:bg-popover group-has-[:focus-visible]/outline:shadow-md motion-reduce:transition-none"
        data-outline-panel
      >
        <div className="max-h-0 overflow-hidden border-b border-transparent opacity-0 transition-[max-height,margin,opacity,border-color] duration-200 ease-out group-hover/outline:mb-1 group-hover/outline:max-h-10 group-hover/outline:border-border group-hover/outline:opacity-100 group-has-[:focus-visible]/outline:mb-1 group-has-[:focus-visible]/outline:max-h-10 group-has-[:focus-visible]/outline:border-border group-has-[:focus-visible]/outline:opacity-100 motion-reduce:transition-none">
          <div className="flex h-9 items-center gap-2 px-2 text-sm font-semibold text-foreground">
            <ListTree aria-hidden="true" className="size-4 text-primary" />
            <span className="min-w-0 flex-1">Trong trang</span>
            <span className="tabular-nums text-xs font-medium text-muted-foreground">
              {items.length}
            </span>
          </div>
        </div>
        <div className="space-y-0.5">
          {items.map((item) => (
            <OutlineButton
              key={item.id}
              headerHeight={headerHeight}
              isActive={activeId === item.id}
              item={item}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
