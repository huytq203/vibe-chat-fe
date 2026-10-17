'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button/Button';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { verifyCodeSchema, type VerifyCodeInput } from '@/features/auth/schemas';

const RESEND_COOLDOWN_SECONDS = 60;

type CodeStepProps = {
  email: string;
  isVerifying: boolean;
  isResending: boolean;
  onVerify: (code: string) => void;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
};

export function CodeStep({ email, isVerifying, isResending, onVerify, onResend, onChangeEmail }: CodeStepProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const form = useForm<VerifyCodeInput>({ resolver: zodResolver(verifyCodeSchema), defaultValues: { code: '' } });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const resend = async (): Promise<void> => {
    await onResend();
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(({ code }) => onVerify(code))} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Đã gửi mã 6 số tới <span className="font-semibold text-foreground">{email}</span>.
        </p>
        <FormField
          control={form.control}
          name="code"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="login-code" className="text-sm text-foreground">
                Mã đăng nhập
              </label>
              <Input
                id="login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                error={fieldState.error?.message}
                className="h-[50px] rounded-full px-5 text-center text-xl tracking-[0.5em]"
                {...field}
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
          )}
        />
        <Button type="submit" className="h-[50px] w-full rounded-full text-base font-bold" isLoading={isVerifying}>
          Đăng nhập
        </Button>
        <div className="flex items-center justify-between text-sm">
          <Button type="button" variant="link" className="h-auto p-0" onClick={onChangeEmail}>
            Đổi email
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            disabled={secondsLeft > 0}
            isLoading={isResending}
            onClick={() => void resend()}
          >
            {secondsLeft > 0 ? `Gửi lại sau ${secondsLeft}s` : 'Gửi lại mã'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
