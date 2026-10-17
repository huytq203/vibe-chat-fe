'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { useExchangeHandoff } from '@/features/auth/hooks/use-login-mutations';
import { LoginCard } from '@/features/auth/components/login/LoginCard';
import { LoginHeading } from '@/features/auth/components/login/LoginHeading';
import { WaitIcon } from '@/features/auth/components/login/StatusIcons';
import { cancelElectronBrowserLogin, startElectronBrowserLogin } from '@/lib/electron';

// Lỗi IPC đến dạng "Error invoking remote method …: Error: <lý do>".
const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : '');

/**
 * Google chặn đăng nhập trong cửa sổ Electron → app mở trình duyệt hệ thống,
 * người dùng đăng nhập ở trang web rồi được đưa lại app qua halo://.
 */
export function DesktopLoginPanel() {
  const router = useRouter();
  const exchange = useExchangeHandoff();
  const [waiting, setWaiting] = useState(false);

  const start = async (): Promise<void> => {
    setWaiting(true);
    try {
      const { code, codeVerifier } = await startElectronBrowserLogin();
      const outcome = await exchange.mutateAsync({ code, codeVerifier });
      if (outcome.status === 'AUTHENTICATED') router.push('/chat');
    } catch (error) {
      const reason = reasonOf(error);
      if (reason.endsWith('cancelled') || reason.endsWith('superseded')) return;
      toast.error(reason.endsWith('timeout') ? 'Quá thời gian chờ đăng nhập, vui lòng thử lại' : 'Đăng nhập không thành công, vui lòng thử lại');
    } finally {
      setWaiting(false);
    }
  };

  if (waiting) {
    return (
      <>
        <LoginHeading
          size="step"
          icon={<WaitIcon />}
          title="Hoàn tất ở trình duyệt"
          description="Đã mở trình duyệt để đăng nhập. Xong bước đó, Halo sẽ tự quay lại ở đây."
        />
        <LoginCard>
          <p className="rounded-xl bg-secondary px-4 py-3.5 text-sm font-semibold text-primary">
            Đang chờ bạn đăng nhập trên trình duyệt…
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void start()}>Mở lại trình duyệt</Button>
            <Button variant="ghost" onClick={cancelElectronBrowserLogin}>Huỷ</Button>
          </div>
        </LoginCard>
      </>
    );
  }

  return (
    <>
      <LoginHeading
        title="Nhắn tin, làm việc, ghi chú. Một nơi."
        description="Halo sẽ mở trình duyệt để bạn đăng nhập bằng Google hoặc mã email, rồi tự quay lại ứng dụng."
      />
      <LoginCard>
        <Button className="h-12 w-full rounded-xl text-base font-bold" onClick={() => void start()} isLoading={exchange.isPending}>
          <Globe className="size-5" aria-hidden="true" />
          Đăng nhập bằng trình duyệt
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Cách này an toàn hơn vì Google không cho đăng nhập trong cửa sổ nhúng của ứng dụng.
        </p>
      </LoginCard>
    </>
  );
}
