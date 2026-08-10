'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, Copy, Pencil, RotateCcw, RotateCw, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type CopyState = 'idle' | 'done' | 'error';

const COPY_LABEL: Record<CopyState, string> = {
  idle: 'Sao chép',
  done: 'Đã sao chép',
  error: 'Trình duyệt chặn sao chép',
};

const COPY_ICON: Record<CopyState, typeof Copy> = {
  idle: Copy,
  done: Check,
  error: AlertCircle,
};

const ACTION_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11.5px] transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const MUTED_ACTION = 'text-muted-foreground hover:bg-muted hover:text-foreground';

/** Nhãn xác nhận tự tắt sau 1.6s để hàng hành động không kẹt ở trạng thái cũ. */
function useCopyText(content: string) {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 1600);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      setState('done');
    } catch {
      setState('error');
    }
  }

  return { state, label: COPY_LABEL[state], Icon: COPY_ICON[state], copy };
}

interface AiCopyButtonProps {
  content: string;
  className?: string;
}

/**
 * Sao chép chỉ-icon đặt cạnh bong bóng: không chiếm chiều cao nên nhịp hội thoại
 * không đổi. Ẩn cho tới khi hover/focus; máy cảm ứng không hover nên luôn hiện mờ.
 */
export function AiCopyButton({ content, className }: AiCopyButtonProps) {
  const { state, label, Icon, copy } = useCopyText(content);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={label}
      title={label}
      className={cn(
        // Chip kính chứ không phải icon trần: trang /ai có wallpaper nên icon mảnh
        // đặt thẳng lên đó sẽ chìm hẳn.
        'shrink-0 self-end rounded-lg border border-border/60 bg-sidebar/85 p-1.5 text-muted-foreground shadow-subtle backdrop-blur-md transition duration-150',
        'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-60',
        state === 'error' && 'text-danger opacity-100',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

interface AiAssistantActionsProps {
  content: string;
  onRegenerate?: () => void;
}

/** Hàng "Sao chép / Trả lời lại" trong thẻ trả lời của AI ở trang /ai. */
export function AiAssistantActions({ content, onRegenerate }: AiAssistantActionsProps) {
  const { state, label, Icon, copy } = useCopyText(content);

  return (
    <div className="mt-2 flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => void copy()}
        className={cn(ACTION_CLASS, MUTED_ACTION, state === 'error' && 'text-danger')}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
      {onRegenerate && (
        <button type="button" onClick={onRegenerate} className={cn(ACTION_CLASS, MUTED_ACTION)}>
          <RotateCcw className="h-3.5 w-3.5" />
          Trả lời lại
        </button>
      )}
    </div>
  );
}

interface AiIncompleteActionsProps {
  content: string;
  reason?: string;
  /** Chỉ có khi đây là tin cuối — chạy lại từ đúng chỗ này mới có nghĩa. */
  onRegenerate?: () => void;
  onDiscard: () => void;
}

/** Chân thẻ trả lời bị đứt giữa chừng: nêu lý do, giữ phần chữ đã nhận, cho chạy lại. */
export function AiIncompleteActions({
  content,
  reason,
  onRegenerate,
  onDiscard,
}: AiIncompleteActionsProps) {
  const { state, label, Icon, copy } = useCopyText(content);

  return (
    <>
      <p
        className="mt-2 flex items-start gap-1.5 border-t border-danger/25 pt-2 text-[11.5px] text-danger"
        role="alert"
      >
        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0">{reason ?? 'Trả lời chưa xong'}</span>
      </p>
      <div className="mt-1 flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => void copy()}
          className={cn(ACTION_CLASS, MUTED_ACTION, state === 'error' && 'text-danger')}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            className={cn(ACTION_CLASS, 'font-medium text-danger hover:bg-danger/10')}
          >
            <RotateCw className="h-3.5 w-3.5" />
            Gửi lại
          </button>
        )}
        <button type="button" onClick={onDiscard} className={cn(ACTION_CLASS, MUTED_ACTION)}>
          <X className="h-3.5 w-3.5" />
          Bỏ
        </button>
      </div>
    </>
  );
}

interface AiFailedActionsProps {
  reason?: string;
  pending: boolean;
  /** Ẩn "Sửa" khi tin có đính kèm — đổ lại ô nhập sẽ làm mất file. */
  canEdit: boolean;
  onResend: () => void;
  onEdit: () => void;
  onDiscard: () => void;
}

/** Lối thoát khi lượt gửi hỏng: nêu lý do rồi cho gửi lại / sửa / bỏ ngay tại chỗ. */
export function AiFailedActions({
  reason,
  pending,
  canEdit,
  onResend,
  onEdit,
  onDiscard,
}: AiFailedActionsProps) {
  return (
    // Nền riêng, không để chữ đỏ trần trên hình nền hội thoại — trang /ai dùng
    // wallpaper nên chữ mảnh đặt trực tiếp lên đó gần như không đọc được.
    <div
      className="mt-1.5 max-w-[85%] rounded-xl border border-danger/30 bg-sidebar/90 px-3 py-2 shadow-subtle backdrop-blur-md"
      role="alert"
    >
      <p className="flex items-start gap-1.5 text-[11.5px] text-danger">
        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0">{reason ?? 'Chưa gửi được'}</span>
      </p>
      <div className="mt-1 flex items-center justify-end gap-0.5">
        <button
          type="button"
          onClick={onResend}
          disabled={pending}
          className={cn(
            ACTION_CLASS,
            'font-medium text-danger hover:bg-danger/10 disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          <RotateCw className={cn('h-3.5 w-3.5', pending && 'animate-spin')} />
          Gửi lại
        </button>
        {canEdit && (
          <button type="button" onClick={onEdit} className={cn(ACTION_CLASS, MUTED_ACTION)}>
            <Pencil className="h-3.5 w-3.5" />
            Sửa
          </button>
        )}
        <button type="button" onClick={onDiscard} className={cn(ACTION_CLASS, MUTED_ACTION)}>
          <X className="h-3.5 w-3.5" />
          Bỏ
        </button>
      </div>
    </div>
  );
}
