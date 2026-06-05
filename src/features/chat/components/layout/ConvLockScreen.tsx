'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { useVerifyLock } from '@/features/chat/hooks/use-mutations';

type ConvLockScreenProps = {
  conversationId: string;
  name: string;
};

export function ConvLockScreen({ conversationId, name }: ConvLockScreenProps) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const verifyMut = useVerifyLock();

  function handleUnlock() {
    if (password.length < 6) {
      setLocalError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    verifyMut.mutate(
      { conversationId, password },
      {
        onError: () => {
          setLocalError('Sai mật khẩu, thử lại');
          setPassword('');
        },
      },
    );
  }

  const errorMsg = localError || (verifyMut.isError ? 'Sai mật khẩu, thử lại' : '');

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-5 bg-background px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Lock className="h-7 w-7 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-foreground">{name}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Nhập mật khẩu để mở hội thoại này
        </p>
      </div>
      <div className="flex w-full max-w-[260px] flex-col gap-3">
        <Input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          autoFocus
          onChange={(e) => { setPassword(e.target.value); setLocalError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
          className={errorMsg ? 'border-danger' : ''}
        />
        {errorMsg && (
          <p className="text-center text-[12px] text-danger">{errorMsg}</p>
        )}
        <Button
          variant="solid"
          className="w-full"
          onClick={handleUnlock}
          disabled={verifyMut.isPending}
        >
          {verifyMut.isPending ? 'Đang xác thực...' : 'Mở khoá'}
        </Button>
      </div>
    </div>
  );
}
