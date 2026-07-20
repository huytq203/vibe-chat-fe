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
import { Textarea } from '@/components/ui/textarea/Textarea';
import { ApiError } from '@/lib/api/client';
import { useUpdateBotWebapp } from '../hooks/use-mutations';
import { updateBotWebappSchema, type UpdateBotWebappInput } from '../schemas';
import type { Bot } from '../types';

function domainsToText(domains: string[] | undefined): string {
  return (domains ?? []).join('\n');
}

export function BotWebappDialog({
  bot,
  open,
  onOpenChange,
}: {
  bot: Bot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateWebapp = useUpdateBotWebapp(bot.id);
  const form = useForm<UpdateBotWebappInput>({
    resolver: zodResolver(updateBotWebappSchema),
    defaultValues: {
      enabled: bot.webappEnabled ?? false,
      menuUrl: bot.webappMenuUrl ?? '',
      menuText: bot.webappMenuText ?? '',
      allowedDomainsText: domainsToText(bot.webappAllowedDomains),
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      enabled: bot.webappEnabled ?? false,
      menuUrl: bot.webappMenuUrl ?? '',
      menuText: bot.webappMenuText ?? '',
      allowedDomainsText: domainsToText(bot.webappAllowedDomains),
    });
  }, [
    bot.id,
    bot.webappAllowedDomains,
    bot.webappEnabled,
    bot.webappMenuText,
    bot.webappMenuUrl,
    form,
    open,
  ]);

  function onSubmit(data: UpdateBotWebappInput) {
    updateWebapp.mutate(data, {
      onSuccess: () => {
        toast.success(data.enabled ? 'Đã bật WebApp' : 'Đã tắt WebApp');
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : 'Cập nhật WebApp thất bại. Thử lại sau.',
        );
      },
    });
  }

  const enabled = form.watch('enabled');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WebApp mini app</DialogTitle>
          <DialogDescription>
            Bật nút menu WebApp và domain allow-list cho bot @{bot.username}.
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
                  label="Bật WebApp"
                />
              )}
            />

            <FormField
              control={form.control}
              name="menuUrl"
              render={({ field, fieldState }) => (
                <Input
                  label="URL menu WebApp"
                  placeholder="https://example.com/halo-webapp"
                  disabled={!enabled}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />

            <FormField
              control={form.control}
              name="menuText"
              render={({ field, fieldState }) => (
                <Input
                  label="Text menu"
                  placeholder="Mở WebApp"
                  disabled={!enabled}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />

            <FormField
              control={form.control}
              name="allowedDomainsText"
              render={({ field, fieldState }) => (
                <Textarea
                  label="Domain allow-list"
                  placeholder={'example.com\napp.example.com'}
                  disabled={!enabled}
                  error={fieldState.error?.message}
                  description="Mỗi dòng hoặc dấu phẩy là một domain. Nếu để trống, bot-service sẽ tự lấy domain từ URL menu."
                  rows={4}
                  {...field}
                />
              )}
            />

            <Button type="submit" isLoading={updateWebapp.isPending}>
              Lưu WebApp
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
