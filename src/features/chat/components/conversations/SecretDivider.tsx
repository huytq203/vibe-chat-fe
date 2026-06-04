import { Lock } from 'lucide-react';

/**
 * Divider phân tách chat thường và secret (E2E) trong danh sách conversation.
 * Chỉ render khi có ít nhất 1 E2E conv.
 */
export function SecretDivider() {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <div className="h-px flex-1 border-t border-dashed border-border" />
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Lock className="h-3 w-3" />
        Secret
      </span>
      <div className="h-px flex-1 border-t border-dashed border-border" />
    </div>
  );
}
