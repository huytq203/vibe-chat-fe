'use client';

import { useState } from 'react';
import { Copy, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';

/**
 * Hiện token plaintext đúng 1 lần (create/issue/rotate) — bắt buộc tick xác
 * nhận đã lưu mới cho đóng, tránh mất token vì BE không lưu lại được (chỉ hash).
 */
export function TokenRevealCard({
  token,
  onDone,
}: {
  token: string;
  onDone: () => void;
}) {
  const [saved, setSaved] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(token);
    toast.success('Đã copy token');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/[0.08] p-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-[12px] text-foreground">
          Token chỉ hiển thị <strong>duy nhất 1 lần</strong>. Hãy lưu lại ngay — bạn sẽ không
          xem lại được token này sau khi đóng.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
        <code className="flex-1 truncate text-[13px]">{token}</code>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Copy token"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <Checkbox
        checked={saved}
        onCheckedChange={(v) => setSaved(Boolean(v))}
        label="Tôi đã lưu token này ở nơi an toàn"
      />

      <Button type="button" disabled={!saved} onClick={onDone}>
        Đóng
      </Button>
    </div>
  );
}
