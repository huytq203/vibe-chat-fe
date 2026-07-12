'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog/AlertDialog';
import { BOT_TOKEN_SCOPE_LABELS } from '../schemas';
import type { BotTokenListItem } from '../types';

function fmt(iso: string | null): string {
  return iso ? format(new Date(iso), 'dd/MM/yyyy HH:mm') : '';
}

export function TokenRow({
  token,
  onRotate,
  onRevoke,
  rotating,
  revoking,
}: {
  token: BotTokenListItem;
  onRotate: () => void;
  onRevoke: () => void;
  rotating: boolean;
  revoking: boolean;
}) {
  const revoked = token.revokedAt != null;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center gap-2">
        <code className="text-[13px] font-semibold">{token.prefix}••••</code>
        {revoked ? (
          <Badge variant="soft-danger" size="sm">Đã thu hồi</Badge>
        ) : (
          <Badge variant="soft-success" size="sm">Đang hoạt động</Badge>
        )}
        {token.scopes.map((s) => (
          <Badge key={s} variant="secondary" size="sm">
            {BOT_TOKEN_SCOPE_LABELS[s]}
          </Badge>
        ))}
      </div>

      <p className="text-[12px] text-muted-foreground">
        Tạo lúc {fmt(token.createdAt)} · Hết hạn: {token.expiresAt ? fmt(token.expiresAt) : 'Không giới hạn'}
        {' · '}
        Dùng lần cuối: {token.lastUsedAt ? fmt(token.lastUsedAt) : 'Chưa dùng'}
      </p>

      {!revoked && (
        <div className="flex gap-2">
          {/* isLoading gắn ở nút TRIGGER (Rotate), không phải nút bên trong AlertDialogClose:
              trigger vẫn mounted xuyên suốt vòng đời component (không nằm trong Portal của
              AlertDialogContent) nên khi AlertDialogClose đóng dialog ngay lúc click, spinner
              vẫn kịp render trên trigger vì rotateToken.isPending chuyển true trước khi request
              resolve — khác với bug Task 9 (nút hiện isLoading lại chính là nút bị
              AlertDialogClose unmount). Xem thêm task-11-report.md mục phân tích. */}
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="ghost" size="sm" isLoading={rotating}>
                Rotate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate token này?</AlertDialogTitle>
                <AlertDialogDescription>
                  Token cũ sẽ ngừng hoạt động ngay lập tức. Bot phải cập nhật token mới để tiếp tục hoạt động.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="ghost" size="sm">Huỷ</Button>} />
                <AlertDialogClose
                  render={
                    <Button variant="danger" size="sm" onClick={onRotate}>
                      Xác nhận rotate
                    </Button>
                  }
                />
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="ghost" size="sm" isLoading={revoking} className="text-destructive">
                Revoke
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Thu hồi token này?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bot sẽ không dùng được token này nữa. Hành động không thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="ghost" size="sm">Huỷ</Button>} />
                <AlertDialogClose
                  render={
                    <Button variant="danger" size="sm" onClick={onRevoke}>
                      Xác nhận revoke
                    </Button>
                  }
                />
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </li>
  );
}
