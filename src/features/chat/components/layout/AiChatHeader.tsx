'use client';

import { ArrowLeft, Bot, PanelLeftOpen, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { DEFAULT_GEMINI_MODEL } from '@/lib/gemini/constants';
import type { AiSession } from '@/features/chat/hooks/useAiSessions';

/** "gemini-2.5-flash" → "Gemini 2.5 Flash" để hiển thị cho người dùng. */
function formatModelName(model: string): string {
  return model
    .split('-')
    .map((part) => (/^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

const MODEL_LABEL = formatModelName(DEFAULT_GEMINI_MODEL);

interface AiChatHeaderProps {
  session: AiSession | null;
  /** Có giá trị → hiện nút quay lại (mobile). */
  onBack?: () => void;
  /** Có giá trị → hiện nút mở lại cột lịch sử (desktop, khi đang thu gọn). */
  onExpandSidebar?: () => void;
  onCreateSession: () => void;
  onDeleteSession?: () => void;
}

export function AiChatHeader({
  session,
  onBack,
  onExpandSidebar,
  onCreateSession,
  onDeleteSession,
}: AiChatHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-2.5 rounded-2xl border bg-sidebar/75 px-3 py-2.5 shadow-subtle backdrop-blur-md">
      {onBack && (
        <Button variant="ghost" size="icon-sm" aria-label="Quay lại" title="Quay lại" onClick={onBack}>
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Button>
      )}
      {onExpandSidebar && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Hiện lịch sử"
          title="Hiện lịch sử"
          onClick={onExpandSidebar}
        >
          <PanelLeftOpen className="h-[18px] w-[18px]" />
        </Button>
      )}

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-subtle">
        <Bot className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[14.5px] font-bold leading-tight text-foreground">
          {session?.title ?? 'Halo AI'}
        </h1>
        <p className="truncate text-[11.5px] leading-tight text-muted-foreground">
          Trợ lý AI · {MODEL_LABEL}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCreateSession}
          aria-label="Trò chuyện mới"
          title="Trò chuyện mới"
        >
          <Plus className="h-[18px] w-[18px]" />
        </Button>
        {session && onDeleteSession && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDeleteSession}
            aria-label="Xoá cuộc trò chuyện này"
            title="Xoá cuộc trò chuyện này"
            className="text-muted-foreground hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </Button>
        )}
      </div>
    </header>
  );
}
