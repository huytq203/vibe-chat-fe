'use client';

import { useState } from 'react';
import type { ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog/Dialog';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Button } from '@/components/ui/button/Button';
import { ApiError } from '@/lib/api/client';
import { useCreateBot } from '../hooks/use-mutations';
import { createBotSchema, type CreateBotInput } from '../schemas';
import { TokenRevealCard } from './TokenRevealCard';

/**
 * Chi tiết sự kiện đóng/mở dialog do Base UI phát ra (ESC, click ra ngoài,
 * nút X). Suy ra từ prop `onOpenChange` của chính `Dialog` thay vì import
 * thẳng type nội bộ của `@base-ui/react`, để không phụ thuộc vào đường dẫn
 * internal của thư viện.
 */
type DialogChangeEventDetails = Parameters<
  NonNullable<ComponentProps<typeof Dialog>['onOpenChange']>
>[1];

export function CreateBotDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createBot = useCreateBot();
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const form = useForm<CreateBotInput>({
    resolver: zodResolver(createBotSchema),
    defaultValues: { username: '', displayName: '', description: '' },
  });

  function handleOpenChange(next: boolean, eventDetails?: DialogChangeEventDetails) {
    // Đang ở màn hiện token: chặn mọi cách đóng ngầm định của Dialog (ESC, click
    // ra ngoài, nút X) — chỉ cho đóng qua nút "Đóng" của TokenRevealCard, vốn đã
    // bị khoá bởi checkbox "đã lưu token". `eventDetails` chỉ tồn tại khi Base UI
    // tự gọi onOpenChange; lời gọi thủ công từ onDone không truyền tham số này.
    if (!next && issuedToken && eventDetails) {
      eventDetails.cancel();
      return;
    }
    if (!next) {
      form.reset();
      setIssuedToken(null);
    }
    onOpenChange(next);
  }

  function onSubmit(data: CreateBotInput) {
    createBot.mutate(data, {
      onSuccess: (created) => {
        setIssuedToken(created.token.token);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'BOT_USERNAME_TAKEN') {
          form.setError('username', { message: err.message });
          return;
        }
        toast.error(err instanceof ApiError ? err.message : 'Tạo bot thất bại. Thử lại sau.');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {issuedToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Tạo bot thành công</DialogTitle>
              <DialogDescription>Lưu lại token bên dưới trước khi đóng.</DialogDescription>
            </DialogHeader>
            <TokenRevealCard token={issuedToken} onDone={() => handleOpenChange(false)} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Tạo bot mới</DialogTitle>
              <DialogDescription>
                Username cần bao gồm chữ &quot;bot&quot; để phân biệt với tài khoản người dùng
                thường.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field, fieldState }) => (
                    <Input
                      label="Username"
                      placeholder="weather_bot"
                      error={fieldState.error?.message}
                      {...field}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field, fieldState }) => (
                    <Input
                      label="Tên hiển thị"
                      placeholder="Weather Bot"
                      error={fieldState.error?.message}
                      {...field}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <Textarea
                      label="Mô tả (tuỳ chọn)"
                      placeholder="Báo thời tiết hằng ngày"
                      error={fieldState.error?.message}
                      {...field}
                    />
                  )}
                />
                <Button type="submit" isLoading={createBot.isPending}>
                  Tạo bot
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
