'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button/Button';
import { Form, FormField } from '@/components/ui/form/Form';
import { verifyCodeSchema, type VerifyCodeInput } from '@/features/auth/schemas';
import { OtpInput } from './OtpInput';

const RESEND_COOLDOWN_SECONDS = 60;

type CodeStepProps = {
  isVerifying: boolean;
  isResending: boolean;
  onVerify: (code: string) => void;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
};

export function CodeStep({ isVerifying, isResending, onVerify, onResend, onChangeEmail }: CodeStepProps) {
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
      <form onSubmit={form.handleSubmit(({ code }) => onVerify(code))} className="space-y-3.5">
        <FormField
          control={form.control}
          name="code"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="login-code" className="text-sm text-foreground">
                Mã đăng nhập
              </label>
              <OtpInput id="login-code" value={field.value} onChange={field.onChange} hasError={Boolean(fieldState.error)} />
              {fieldState.error && <p className="text-sm text-danger">{fieldState.error.message}</p>}
            </div>
          )}
        />
        <Button type="submit" className="h-12 w-full rounded-xl text-base font-bold" isLoading={isVerifying}>
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
