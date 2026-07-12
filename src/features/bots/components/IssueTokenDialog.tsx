'use client';

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
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Button } from '@/components/ui/button/Button';
import { ApiError } from '@/lib/api/client';
import { useIssueToken } from '../hooks/use-mutations';
import {
  issueTokenSchema,
  BOT_TOKEN_SCOPES,
  BOT_TOKEN_SCOPE_LABELS,
  type IssueTokenInput,
} from '../schemas';

export function IssueTokenDialog({
  botId,
  open,
  onOpenChange,
  onIssued,
}: {
  botId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: (token: string) => void;
}) {
  const issueToken = useIssueToken(botId);
  const form = useForm<IssueTokenInput>({
    resolver: zodResolver(issueTokenSchema),
    defaultValues: { scopes: [] },
  });

  function onSubmit(data: IssueTokenInput) {
    issueToken.mutate(data, {
      onSuccess: (issued) => {
        form.reset({ scopes: [] });
        onIssued(issued.token);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : 'Cấp token thất bại. Thử lại sau.');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cấp token mới</DialogTitle>
          <DialogDescription>Chọn quyền hạn (scope) và hạn dùng cho token.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="scopes"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  {BOT_TOKEN_SCOPES.map((scope) => (
                    <Checkbox
                      key={scope}
                      checked={(field.value ?? []).includes(scope)}
                      onCheckedChange={(checked) => {
                        const current = field.value ?? [];
                        field.onChange(
                          checked ? [...current, scope] : current.filter((s) => s !== scope),
                        );
                      }}
                      label={BOT_TOKEN_SCOPE_LABELS[scope]}
                    />
                  ))}
                </div>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field, fieldState }) => (
                <DatePicker
                  mode="single"
                  editable
                  label="Hạn dùng (bỏ trống = không giới hạn)"
                  placeholder="dd/mm/yyyy"
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(d) => field.onChange(d instanceof Date ? d.toISOString() : undefined)}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Button type="submit" isLoading={issueToken.isPending}>
              Cấp token
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
