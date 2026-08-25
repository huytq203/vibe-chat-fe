'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const focusRingClassName =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function TrashLink() {
  const pathname = usePathname();
  const isActive = pathname === '/notes/trash';

  return (
    <Link
      href="/notes/trash"
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex h-[30px] items-center gap-2.5 rounded-sm px-3 text-sm font-normal text-muted-foreground',
        'transition-colors hover:bg-sidebar-accent hover:text-foreground',
        isActive && 'bg-sidebar-accent text-foreground',
        focusRingClassName,
      )}
    >
      <Trash2 aria-hidden="true" className="size-3.5 shrink-0" />
      Thùng rác
    </Link>
  );
}
