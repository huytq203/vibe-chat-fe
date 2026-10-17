'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button/Button';
import { LoginCard } from './LoginCard';
import { LoginHeading } from './LoginHeading';
import { DoneIcon } from './StatusIcons';

/** Trình duyệt đã xác thực xong, trả quyền về app desktop qua deep link halo://. */
export function HandoffDone({ redirectUrl }: { redirectUrl: string }) {
  useEffect(() => {
    window.location.assign(redirectUrl);
  }, [redirectUrl]);

  return (
    <>
      <LoginHeading
        size="step"
        icon={<DoneIcon />}
        title="Đã xác thực"
        description="Quay lại ứng dụng Halo để tiếp tục. Bạn có thể đóng tab này."
      />
      <LoginCard>
        <Button className="h-12 w-full rounded-xl text-base font-bold" onClick={() => window.location.assign(redirectUrl)}>
          Mở ứng dụng Halo
        </Button>
      </LoginCard>
    </>
  );
}
