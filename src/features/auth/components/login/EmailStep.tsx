'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button/Button';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { requestCodeSchema, type RequestCodeInput } from '@/features/auth/schemas';

const FIELD_CLASS =
  'h-[50px] rounded-full border-border bg-input px-5 text-foreground placeholder:text-muted-foreground focus:border-primary';

type EmailStepProps = {
  defaultEmail: string;
  isPending: boolean;
  onSubmit: (email: string) => void;
};

export function EmailStep({ defaultEmail, isPending, onSubmit }: EmailStepProps) {
  const form = useForm<RequestCodeInput>({
    resolver: zodResolver(requestCodeSchema),
    defaultValues: { email: defaultEmail },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(({ email }) => onSubmit(email))} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm text-foreground">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                inputMode="email"
                placeholder="ban@gmail.com"
                autoComplete="email"
                error={fieldState.error?.message}
                className={FIELD_CLASS}
                {...field}
              />
            </div>
          )}
        />
        <Button type="submit" className="h-[50px] w-full rounded-full text-base font-bold" isLoading={isPending}>
          Gửi mã đăng nhập
        </Button>
      </form>
    </Form>
  );
}
