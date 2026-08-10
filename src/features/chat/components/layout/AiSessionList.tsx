'use client';

import { useState } from 'react';
import { ArrowLeft, MessagesSquare, PanelLeftClose, Plus, Search, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { cn } from '@/lib/utils/cn';
import type { AiSession } from '@/features/chat/hooks/useAiSessions';
import { useAiSessionGroups } from '@/features/chat/hooks/useAiSessionGroups';
import { AiSessionItem } from './AiSessionItem';

interface AiSessionListProps {
  sessions: AiSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  /** Có nút thu gọn (desktop). Mobile ẩn đi vì danh sách chiếm nguyên màn. */
  onCollapse?: () => void;
  /** Mobile: rời khu vực AI (không có NavSidebar để bấm). */
  onBack?: () => void;
}

export function AiSessionList({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onCollapse,
  onBack,
}: AiSessionListProps) {
  const [query, setQuery] = useState('');
  const groups = useAiSessionGroups(sessions, query);

  const isEmpty = sessions.length === 0;
  const isNoResult = !isEmpty && groups.length === 0;

  return (
    <aside
      aria-label="Lịch sử trò chuyện với AI"
      className={cn(
        'flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border',
        'bg-sidebar/75 text-sidebar-foreground shadow-subtle backdrop-blur-md',
        'md:w-[280px] md:min-w-[280px]',
      )}
    >
      <header className="flex shrink-0 items-center gap-2 px-3 pt-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            title="Quay lại tin nhắn"
            aria-label="Quay lại tin nhắn"
            className="-ml-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="flex-1 text-[13px] font-bold tracking-tight text-foreground">Lịch sử</h2>
        {sessions.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">{sessions.length}</span>
        )}
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCollapse}
            title="Thu gọn lịch sử"
            aria-label="Thu gọn lịch sử"
            className="-mr-1"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-2.5">
        <Input
          variant="filled"
          icon={<Search className="h-3.5 w-3.5" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm trong lịch sử..."
          aria-label="Tìm trong lịch sử"
          className="h-8 text-[12.5px]"
        />
        <Button
          variant="solid"
          size="icon-sm"
          onClick={onCreate}
          title="Trò chuyện mới"
          aria-label="Trò chuyện mới"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isEmpty && (
          <div className="flex flex-col items-center gap-3 px-4 pt-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
              <MessagesSquare className="h-5 w-5 text-primary/70" />
            </span>
            <p className="text-[12.5px] leading-snug text-muted-foreground">
              Lịch sử trống. Bắt đầu cuộc trò chuyện đầu tiên với Halo AI.
            </p>
            <Button variant="outline" size="sm" onClick={onCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Trò chuyện mới
            </Button>
          </div>
        )}

        {isNoResult && (
          <div className="flex flex-col items-center gap-3 px-4 pt-12 text-center">
            <SearchX className="h-6 w-6 text-muted-foreground/60" />
            <p className="text-[12.5px] leading-snug text-muted-foreground">
              Không có cuộc trò chuyện nào khớp với “{query.trim()}”.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setQuery('')}>
              Xoá bộ lọc
            </Button>
          </div>
        )}

        {groups.map((group) => (
          <section key={group.label}>
            <h3 className="px-2 pb-1 pt-3.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-1">
              {group.label}
            </h3>
            <div className="flex flex-col gap-0.5">
              {group.sessions.map((session) => (
                <AiSessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
