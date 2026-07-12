'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Button } from '@/components/ui/button/Button';
import { ApiError } from '@/lib/api/client';
import { useUpdateBot } from '../hooks/use-mutations';
import { updateBotSchema, type UpdateBotInput } from '../schemas';
import type { Bot } from '../types';

export function EditBotDialog({
  bot,
  open,
  onOpenChange,
}: {
  bot: Bot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateBot = useUpdateBot(bot.id);
  const form = useForm<UpdateBotInput>({
    resolver: zodResolver(updateBotSchema),
    defaultValues: {
      username: bot.username,
      displayName: bot.displayName,
      description: bot.description ?? '',
    },
  });

  function onSubmit(data: UpdateBotInput) {
    updateBot.mutate(data, {
      onSuccess: () => {
        toast.success('Đã cập nhật bot');
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Cập nhật thất bại. Thử lại sau.');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa thông tin bot</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field, fieldState }) => (
                <Input label="Tên hiển thị" error={fieldState.error?.message} {...field} />
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Textarea label="Mô tả" error={fieldState.error?.message} {...field} />
              )}
            />
            <Button type="submit" isLoading={updateBot.isPending}>
              Lưu
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
