'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Button } from '@/components/ui/button/Button';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { ApiError } from '@/lib/api/client';
import { useUpdateBotInline } from '../hooks/use-mutations';
import {
  updateBotInlineSchema,
  type UpdateBotInlineInput,
} from '../schemas';
import type { Bot } from '../types';

export function BotInlineDialog({
  bot,
  open,
  onOpenChange,
}: {
  bot: Bot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateInline = useUpdateBotInline(bot.id);
  const form = useForm<UpdateBotInlineInput>({
    resolver: zodResolver(updateBotInlineSchema),
    defaultValues: {
      enabled: bot.inlineModeEnabled ?? false,
      placeholder: bot.inlinePlaceholder ?? '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      enabled: bot.inlineModeEnabled ?? false,
      placeholder: bot.inlinePlaceholder ?? '',
    });
  }, [bot.id, bot.inlineModeEnabled, bot.inlinePlaceholder, form, open]);

  function onSubmit(data: UpdateBotInlineInput) {
    updateInline.mutate(
      {
        enabled: data.enabled,
        placeholder: data.placeholder?.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(data.enabled ? 'Đã bật inline mode' : 'Đã tắt inline mode');
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError
              ? err.message
              : 'Cập nhật inline mode thất bại. Thử lại sau.',
          );
        },
      },
    );
  }

  const enabled = form.watch('enabled');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inline mode</DialogTitle>
          <DialogDescription>
            Cho phép gọi bot bằng cú pháp @{bot.username} trong ô nhập tin nhắn.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  label="Bật inline mode"
                />
              )}
            />

            <FormField
              control={form.control}
              name="placeholder"
              render={({ field, fieldState }) => (
                <Input
                  label="Gợi ý khi user gọi bot"
                  placeholder="Ví dụ: tìm ảnh, thời tiết, gif..."
                  disabled={!enabled}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />

            <Button type="submit" isLoading={updateInline.isPending}>
              Lưu inline mode
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
