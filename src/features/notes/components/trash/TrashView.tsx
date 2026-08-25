'use client';

import { Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { TrashList } from './TrashList';

interface TrashViewProps {
  workspaceId: string;
}

export function TrashView({ workspaceId }: TrashViewProps) {
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-[44px] shrink-0 items-center gap-2 border-b border-border px-4">
        <Trash2 aria-hidden="true" className="size-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold text-foreground">Thùng rác</h1>
      </div>
      <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <TrashList workspaceId={workspaceId} />
      </ScrollArea>
    </main>
  );
}
