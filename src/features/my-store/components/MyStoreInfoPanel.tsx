'use client';

import { useState, type ReactNode } from 'react';
import { Archive, Bell, Bookmark, CheckSquare, ChevronRight, FolderOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { SharedTabs } from '@/features/chat/components/contact/SharedTabs';
import { useStoreMessages } from '@/features/my-store/hooks/use-query';
import { QuotaBar } from './QuotaBar';
import { MyStoreNoteListView, type NoteType } from './MyStoreNoteListView';

type Props = {
  conversationId: string;
  /** Khi nhúng cố định (layout Kho) thì bỏ qua → ẩn nút đóng. */
  onClose?: () => void;
  /** Mở chế độ Tệp & thư mục. */
  onOpenFiles: () => void;
};

type Row = { type: NoteType; label: string; empty: string; icon: ReactNode; count: number };

function CategoryRow({ icon, label, count, onClick }: { icon: ReactNode; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-[13px] text-foreground">{label}</span>
      <span className="text-[12px] text-muted-foreground">{count}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

/**
 * Panel phải "Kho của tôi" (SELF conversation): ảnh/video/liên kết (SharedTabs),
 * thanh quota, lối vào Tệp & thư mục, và các nhóm ghi chú (click → list riêng).
 */
export function MyStoreInfoPanel({ conversationId, onClose, onOpenFiles }: Props) {
  const [view, setView] = useState<'overview' | NoteType>('overview');
  const { data } = useStoreMessages();

  // Dedupe theo id (cursor pagination + invalidate có thể trả trùng) → đếm chính xác.
  const messages = Array.from(
    new Map(
      (data?.pages ?? []).flatMap((p) => p.items).filter((m) => !m.isDeleted).map((m) => [m.id, m]),
    ).values(),
  );
  const countOf = (type: NoteType) => messages.filter((m) => m.type === type).length;

  const rows: Row[] = [
    { type: 'REMINDER', label: 'Nhắc nhở', empty: 'Chưa có nhắc nhở nào', icon: <Bell className="h-4 w-4" />, count: countOf('REMINDER') },
    { type: 'CHECKLIST', label: 'Checklist', empty: 'Chưa có checklist nào', icon: <CheckSquare className="h-4 w-4" />, count: countOf('CHECKLIST') },
    { type: 'BOOKMARK', label: 'Bookmark', empty: 'Chưa có bookmark nào', icon: <Bookmark className="h-4 w-4" />, count: countOf('BOOKMARK') },
  ];

  if (view !== 'overview') {
    const row = rows.find((r) => r.type === view)!;
    return (
      <MyStoreNoteListView
        type={row.type}
        title={row.label}
        emptyLabel={row.empty}
        onBack={() => setView('overview')}
        onClose={onClose}
      />
    );
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 pb-3 pt-[18px]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
          <Archive className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 truncate text-sm font-bold">Kho của tôi</span>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng" title="Đóng">
            <X className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <section className="px-3 pt-3">
          <SharedTabs conversationId={conversationId} />
        </section>

        <section className="px-3 pb-2 pt-3">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ghi chú</div>
          <div className="flex flex-col gap-0.5">
            {rows.map((r) => (
              <CategoryRow key={r.type} icon={r.icon} label={r.label} count={r.count} onClick={() => setView(r.type)} />
            ))}
            <button
              type="button"
              onClick={onOpenFiles}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
            >
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-[13px] text-foreground">Tệp & thư mục</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </section>
      </div>

      <div className="shrink-0">
        <div className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Dung lượng
        </div>
        <QuotaBar />
      </div>
    </aside>
  );
}
