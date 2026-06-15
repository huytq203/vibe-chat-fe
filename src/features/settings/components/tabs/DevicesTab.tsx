'use client';

import type { ReactNode } from 'react';
import { Globe, LogOut, Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
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
import { cn } from '@/lib/utils/cn';
import { formatListTime } from '@/features/chat/utils';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import {
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
} from '@/features/settings/hooks/use-sessions';
import type { DeviceType } from '@/lib/device/device-info';
import type { UserSessionInfo } from '@/features/settings/types';

/** Nhãn loại thiết bị khi không có tên cụ thể từ BE. */
function deviceTypeLabel(type: DeviceType): string {
  switch (type) {
    case 'WEB':
      return 'Trình duyệt web';
    case 'MOBILE':
      return 'Điện thoại';
    case 'DESKTOP':
      return 'Ứng dụng máy tính';
  }
}

/** Icon đại diện theo loại thiết bị. */
function deviceIcon(type: DeviceType): ReactNode {
  const className = 'h-[18px] w-[18px]';
  switch (type) {
    case 'DESKTOP':
      return <Monitor className={className} />;
    case 'MOBILE':
      return <Smartphone className={className} />;
    case 'WEB':
      return <Globe className={className} />;
  }
}

/**
 * Tab "Thiết bị đăng nhập" — liệt kê các phiên đang hoạt động, cho phép đá 1 thiết bị
 * hoặc đăng xuất tất cả thiết bị khác. Thiết bị hiện tại không đá được tại đây (dùng Đăng xuất thường).
 */
export function DevicesTab() {
  const { data, isLoading, isError } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  function handleRevoke(sessionId: string) {
    revokeSession.mutate(sessionId, {
      onSuccess: () => toast.success('Đã đăng xuất thiết bị'),
      onError: (e) =>
        toast.error(e instanceof ApiError ? e.message : 'Đăng xuất thiết bị thất bại'),
    });
  }

  function handleRevokeOthers() {
    revokeOthers.mutate(undefined, {
      onSuccess: () => toast.success('Đã đăng xuất các thiết bị khác'),
      onError: (e) =>
        toast.error(e instanceof ApiError ? e.message : 'Đăng xuất các thiết bị khác thất bại'),
    });
  }

  // Thiết bị hiện tại lên đầu danh sách cho dễ nhận biết.
  const sessions = [...(data ?? [])].sort((a, b) => Number(b.current) - Number(a.current));
  const hasOthers = sessions.some((s) => !s.current);

  return (
    <SettingsSection
      title="Thiết bị đăng nhập"
      desc="Quản lý các thiết bị đang đăng nhập vào tài khoản của bạn."
    >
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[60px] w-full" rounded="lg" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-[13px] text-muted-foreground">Không tải được danh sách thiết bị.</p>
      )}

      {!isLoading && !isError && (
        <>
          <ul className="flex flex-col gap-2">
            {sessions.map((session) => (
              <SessionRow
                key={session.sessionId}
                session={session}
                pending={
                  revokeSession.isPending && revokeSession.variables === session.sessionId
                }
                onRevoke={handleRevoke}
              />
            ))}
          </ul>

          {hasOthers && (
            <div className="mt-4">
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button variant="danger" size="sm" isLoading={revokeOthers.isPending}>
                    Đăng xuất tất cả thiết bị khác
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Đăng xuất tất cả thiết bị khác?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Mọi thiết bị khác sẽ bị đăng xuất ngay. Thiết bị bạn đang dùng vẫn giữ phiên.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogClose
                      render={
                        <Button variant="ghost" size="sm">
                          Huỷ
                        </Button>
                      }
                    />
                    <AlertDialogClose
                      render={
                        <Button variant="danger" size="sm" onClick={handleRevokeOthers}>
                          Đăng xuất
                        </Button>
                      }
                    />
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </>
      )}
    </SettingsSection>
  );
}

/** 1 dòng thiết bị trong danh sách phiên. */
function SessionRow({
  session,
  pending,
  onRevoke,
}: {
  session: UserSessionInfo;
  pending: boolean;
  onRevoke: (sessionId: string) => void;
}) {
  const primary = session.deviceName ?? deviceTypeLabel(session.deviceType);
  const secondary = `${session.ipAddress ?? 'IP ẩn'} · ${formatListTime(session.lastSeenAt)}`;

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border px-3 py-2.5',
        session.current && 'bg-primary/[0.04]',
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        {deviceIcon(session.deviceType)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-foreground">{primary}</p>
          {session.current && (
            <Badge variant="soft-primary" size="sm">
              Thiết bị này
            </Badge>
          )}
        </div>
        <p className="truncate text-[12px] text-muted-foreground">{secondary}</p>
      </div>

      {!session.current && (
        <Button
          variant="ghost"
          size="sm"
          isLoading={pending}
          leftIcon={<LogOut className="h-4 w-4" />}
          onClick={() => onRevoke(session.sessionId)}
        >
          Đăng xuất
        </Button>
      )}
    </li>
  );
}
