'use client';

import { useState } from 'react';
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

  function handleOpenChange(next: boolean) {
    if (!next) setRevealToken(null);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Token của {bot.displayName}</DialogTitle>
          <DialogDescription>Quản lý token dùng để xác thực Bot API.</DialogDescription>
        </DialogHeader>

        {revealToken ? (
          <TokenRevealCard token={revealToken} onDone={() => setRevealToken(null)} />
        ) : (
          <>
            {isLoading && (
              <div className="flex flex-col gap-2">
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
              <ul className="flex flex-col gap-2">
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

            <div className="mt-2">
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
