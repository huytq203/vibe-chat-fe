'use client';

import { useMutation } from '@tanstack/react-query';
import { LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { Input } from '@/components/ui/input/Input';

export const INVALID_PUBLIC_LINK_MESSAGE = 'Liên kết không hợp lệ hoặc đã hết hạn.';

async function unlockPublicPage(token: string, password: string): Promise<void> {
  const url = new URL(`/p/${encodeURIComponent(token)}/unlock`, window.location.origin);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error(INVALID_PUBLIC_LINK_MESSAGE);
}

interface PasswordGateProps {
  token: string;
}

export function PasswordGate({ token }: PasswordGateProps) {
  const router = useRouter();
  const unlockMutation = useMutation({
    mutationFn: (password: string) => unlockPublicPage(token, password),
    onSuccess: () => router.refresh(),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    unlockMutation.mutate(String(form.get('password') ?? ''));
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-12 text-foreground">
      <Card className="w-full max-w-[400px]" padding="none">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </div>
          <CardTitle>Trang được bảo vệ</CardTitle>
          <CardDescription>Nhập mật khẩu để đọc nội dung được chia sẻ.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              name="password"
              type="password"
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
              autoFocus
              aria-invalid={unlockMutation.isError}
              aria-describedby={unlockMutation.isError ? 'public-password-error' : undefined}
            />
            {unlockMutation.isError && (
              // Mọi lỗi xác thực dùng cùng thông điệp để không xác nhận token từng tồn tại.
              <p id="public-password-error" role="alert" className="text-sm text-danger">
                {INVALID_PUBLIC_LINK_MESSAGE}
              </p>
            )}
            <Button type="submit" className="w-full" isLoading={unlockMutation.isPending}>
              Mở khoá
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
