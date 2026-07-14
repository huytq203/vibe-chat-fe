'use client';

import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog/Dialog';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Button } from '@/components/ui/button/Button';
import { ApiError } from '@/lib/api/client';
import { useBotTokens } from '../hooks/use-query';
import { useRotateToken, useRevokeToken } from '../hooks/use-mutations';
import { TokenRow } from './TokenRow';
import { TokenRevealCard } from './TokenRevealCard';
import { IssueTokenDialog } from './IssueTokenDialog';
import type { Bot } from '../types';

/**
 * Chi tiết sự kiện đóng/mở dialog do Base UI phát ra (ESC, click ra ngoài,
 * nút X). Suy ra từ prop `onOpenChange` của chính `Dialog` thay vì import
 * thẳng type nội bộ của `@base-ui/react`, để không phụ thuộc vào đường dẫn
 * internal của thư viện.
 */
type DialogChangeEventDetails = Parameters<
  NonNullable<ComponentProps<typeof Dialog>['onOpenChange']>
>[1];

export function BotTokensPanel({
  bot,
  open,
  onOpenChange,
}: {
  bot: Bot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: tokens, isLoading, isError } = useBotTokens(bot.id);
  const rotateToken = useRotateToken(bot.id);
  const revokeToken = useRevokeToken(bot.id);
  const [revealToken, setRevealToken] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);

  function handleRotate(tokenId: string) {
    rotateToken.mutate(
      { tokenId, input: {} },
      {
        onSuccess: (issued) => setRevealToken(issued.token),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : 'Rotate token thất bại.'),
      },
    );
  }

  function handleRevoke(tokenId: string) {
    revokeToken.mutate(tokenId, {
      onSuccess: () => toast.success('Đã thu hồi token'),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : 'Thu hồi token thất bại.'),
    });
  }

  function handleOpenChange(next: boolean, eventDetails?: DialogChangeEventDetails) {
    // Đang hiện token vừa rotate/issue: chặn mọi cách đóng ngầm định của Dialog
    // (ESC, click ra ngoài, nút X) — chỉ cho đóng qua nút "Đóng" của
    // TokenRevealCard, vốn đã bị khoá bởi checkbox "đã lưu token". `eventDetails`
    // chỉ tồn tại khi Base UI tự gọi onOpenChange; lời gọi thủ công từ onDone
    // không truyền tham số này.
    if (!next && revealToken && eventDetails) {
      eventDetails.cancel();
      return;
    }
    if (!next) setRevealToken(null);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Token của {bot.displayName}</DialogTitle>
          <DialogDescription>Quản lý token dùng để xác thực Bot API.</DialogDescription>
        </DialogHeader>

        {revealToken ? (
          <TokenRevealCard token={revealToken} onDone={() => setRevealToken(null)} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {isLoading && (
              <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-[70px] w-full" rounded="lg" />
                ))}
              </div>
            )}

            {!isLoading && isError && (
              <p className="text-[13px] text-muted-foreground">Không tải được danh sách token.</p>
            )}

            {!isLoading && !isError && tokens && tokens.length === 0 && (
              <p className="text-[13px] text-muted-foreground">Bot này chưa có token nào.</p>
            )}

            {!isLoading && !isError && tokens && tokens.length > 0 && (
              <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {tokens.map((token) => (
                  <TokenRow
                    key={token.id}
                    token={token}
                    onRotate={() => handleRotate(token.id)}
                    onRevoke={() => handleRevoke(token.id)}
                    rotating={rotateToken.isPending && rotateToken.variables?.tokenId === token.id}
                    revoking={revokeToken.isPending && revokeToken.variables === token.id}
                  />
                ))}
              </ul>
            )}

            <div className="shrink-0 border-t border-border pt-3">
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIssueOpen(true)}
              >
                Cấp token mới
              </Button>
            </div>

            <IssueTokenDialog
              botId={bot.id}
              open={issueOpen}
              onOpenChange={setIssueOpen}
              onIssued={(token) => {
                setIssueOpen(false);
                setRevealToken(token);
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
