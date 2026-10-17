'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { useExchangeHandoff } from '@/features/auth/hooks/use-login-mutations';
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

  return (
    <div className="w-full max-w-sm space-y-6">
      <div>
        <p className="text-2xl font-bold text-primary">Halo</p>
        <h1 className="mt-1 text-[32px] font-bold leading-tight text-foreground">Đăng nhập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halo sẽ mở trình duyệt để bạn đăng nhập bằng Google hoặc mã email, rồi tự quay lại ứng dụng.
        </p>
      </div>
      {waiting ? (
        <div className="space-y-3">
          <p className="text-sm text-foreground">Đang chờ bạn đăng nhập trên trình duyệt…</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void start()}>Mở lại trình duyệt</Button>
            <Button variant="ghost" onClick={cancelElectronBrowserLogin}>Huỷ</Button>
          </div>
        </div>
      ) : (
        <Button className="h-[50px] w-full rounded-full text-base font-bold" onClick={() => void start()} isLoading={exchange.isPending}>
          <Globe className="size-5" aria-hidden="true" />
          Đăng nhập bằng trình duyệt
        </Button>
      )}
    </div>
  );
}
