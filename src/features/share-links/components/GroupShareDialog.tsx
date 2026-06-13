'use client';

import { Copy, Link2, Loader2, QrCode, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog/Dialog';
import { Button } from '@/components/ui/button/Button';
import { useMyShareLinks } from '../hooks/use-query';
import { useCreateShareLink, useRevokeShareLink } from '../hooks/use-mutations';
import type { ShareLink } from '../types';

/** Link còn hiệu lực: chưa thu hồi, chưa hết hạn, chưa hết lượt. */
function isLive(l: ShareLink): boolean {
  if (l.isRevoked) return false;
  if (l.expiresAt && new Date(l.expiresAt).getTime() < Date.now()) return false;
  if (l.maxUses != null && l.usedCount >= l.maxUses) return false;
  return true;
}

type GroupShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  groupName?: string | null;
};

/**
 * Chia sẻ nhóm qua link + QR (xem 25-share-links.md). Tái dùng link GROUP còn sống
 * của đúng nhóm này nếu đã tạo. Yêu cầu: caller là OWNER/ADMIN/MODERATOR + joinByLink bật.
 */
export function GroupShareDialog({ open, onOpenChange, conversationId, groupName }: GroupShareDialogProps) {
  const { data: links, isLoading } = useMyShareLinks(open);
  const create = useCreateShareLink();
  const revoke = useRevokeShareLink();

  const active =
    (links ?? []).find((l) => l.type === 'GROUP' && l.targetId === conversationId && isLive(l)) ?? null;

  const copy = (url: string) => {
    void navigator.clipboard?.writeText(url).then(
      () => toast.success('Đã sao chép link'),
      () => toast.error('Không sao chép được'),
    );
  };

  function handleCreate() {
    create.mutate({ type: 'GROUP', targetId: conversationId, label: groupName ?? undefined });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Mời vào nhóm</DialogTitle>
        <DialogDescription>Người khác quét QR hoặc mở link để tham gia nhóm.</DialogDescription>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : active ? (
          <div className="flex flex-col items-center gap-4 pt-2">
            {/* QR do BE sinh sẵn (data URL PNG) — không cần thư viện QR. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.qrDataUrl} alt="QR nhóm" width={220} height={220} className="rounded-xl border border-border" />
            <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{active.url}</span>
              <button
                type="button"
                onClick={() => copy(active.url)}
                aria-label="Sao chép link"
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Đã dùng {active.usedCount} lượt
              {active.expiresAt ? ` · hết hạn ${new Date(active.expiresAt).toLocaleDateString('vi-VN')}` : ''}
            </p>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              isLoading={revoke.isPending}
              onClick={() => revoke.mutate(active.code)}
            >
              <Trash2 className="h-4 w-4" /> Thu hồi link
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6">
            <QrCode className="h-12 w-12 text-muted-foreground" />
            <p className="text-center text-sm text-muted-foreground">Nhóm chưa có link mời.</p>
            <Button variant="solid" isLoading={create.isPending} onClick={handleCreate}>
              <Users className="h-4 w-4" /> Tạo link mời
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
