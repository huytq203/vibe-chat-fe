'use client';

import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

/** Trình duyệt đã xác thực xong — trả quyền về app desktop qua deep link halo://. */
export function HandoffDone({ redirectUrl }: { redirectUrl: string }) {
  useEffect(() => {
    window.location.assign(redirectUrl);
  }, [redirectUrl]);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
      <h2 className="text-xl font-bold text-foreground">Đã xác thực</h2>
      <p className="text-sm text-muted-foreground">
        Quay lại ứng dụng Halo để tiếp tục. Bạn có thể đóng tab này.
      </p>
      <Button variant="outline" onClick={() => window.location.assign(redirectUrl)}>
        Mở ứng dụng Halo
      </Button>
    </div>
  );
}
