'use client';

import { CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { usePatchChecklistItem } from '@/features/my-store/hooks/use-mutations';
import { useDecryptedMetadata } from '@/features/my-store/hooks/use-decrypted-metadata';
import type { ChecklistMetadata, ChecklistSecret } from '@/features/my-store/types';

type ChecklistCardProps = {
  message: { id: string; conversationId: string; metadata: Record<string, unknown> | null; isDeleted: boolean };
};

export function ChecklistCard({ message }: ChecklistCardProps) {
  const meta = message.metadata as ChecklistMetadata | null;
  const patch = usePatchChecklistItem();
  // title + text từng item nhạy cảm: giải mã (Phase 1) hoặc plaintext (back-compat).
  const { data: secret } = useDecryptedMetadata<ChecklistSecret>(
    message.conversationId,
    message.metadata,
  );
  const textById = new Map((secret?.items ?? []).map((i) => [i.id, i.text]));
  const title = secret?.title ?? meta?.title ?? 'Checklist';

  const items = (meta?.items ?? []).map((it) => ({
    ...it,
    text: textById.get(it.id) ?? it.text ?? '',
  }));
  const checkedCount = items.filter((i) => i.checked).length;
  const total = items.length;

  function toggle(itemId: string, checked: boolean) {
    if (message.isDeleted || patch.isPending) return;
    patch.mutate({ messageId: message.id, dto: { itemId, checked } });
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 flex flex-col gap-3 max-w-sm shadow-sm">
      <div className="flex items-center gap-2 pr-7">
        <CheckSquare className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm font-semibold truncate flex-1 text-foreground">{title}</p>
        <span className="text-xs text-muted-foreground shrink-0">
          {checkedCount}/{total}
        </span>
      </div>

      {total > 0 && (
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(checkedCount / total) * 100}%` }}
          />
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2.5 cursor-pointer group"
            onClick={() => toggle(item.id, !item.checked)}
          >
            <div
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors',
                item.checked
                  ? 'bg-primary border-primary'
                  : 'border-border group-hover:border-primary/60',
              )}
            >
              {item.checked && (
                <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-primary-foreground">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              className={cn(
                'text-sm leading-tight transition-colors',
                item.checked && 'line-through text-muted-foreground',
              )}
            >
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
