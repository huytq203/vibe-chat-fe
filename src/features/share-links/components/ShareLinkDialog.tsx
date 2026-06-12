'use client';

import { Copy, Link2, Loader2, QrCode, Trash2 } from 'lucide-react';
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

type ShareLinkDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

/** Chia sẻ hồ sơ cá nhân qua link + QR. Tái dùng link USER còn sống nếu đã có. */
export function ShareLinkDialog({ open, onOpenChange }: ShareLinkDialogProps) {
  const { data: links, isLoading } = useMyShareLinks(open);
  const create = useCreateShareLink();
  const revoke = useRevokeShareLink();

  const active = (links ?? []).find((l) => l.type === 'USER' && isLive(l)) ?? null;

  const copy = (url: string) => {
    void navigator.clipboard?.writeText(url).then(
      () => toast.success('Đã sao chép link'),
      () => toast.error('Không sao chép được'),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Chia sẻ hồ sơ</DialogTitle>
        <DialogDescription>Người khác quét QR hoặc mở link để xem hồ sơ và kết bạn.</DialogDescription>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : active ? (
          <div className="flex flex-col items-center gap-4 pt-2">
            {/* QR do BE sinh sẵn (data URL PNG) — không cần thư viện QR. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.qrDataUrl} alt="QR hồ sơ" width={220} height={220} className="rounded-xl border border-border" />
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
            <p className="text-center text-sm text-muted-foreground">Bạn chưa có link chia sẻ hồ sơ.</p>
            <Button variant="solid" isLoading={create.isPending} onClick={() => create.mutate({ type: 'USER' })}>
              Tạo link chia sẻ
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
