'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button/Button';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { completeProfileSchema, type CompleteProfileInput } from '@/features/auth/schemas';

const THIS_YEAR = new Date().getFullYear();
const FIELD_CLASS = 'h-[50px] rounded-full px-5';

type CompleteProfileFormProps = {
  prefill: { email: string; displayName: string };
  isPending: boolean;
  onSubmit: (input: CompleteProfileInput) => void;
};

/** Email/Google đã xác minh nhưng chưa có tài khoản → hoàn tất hồ sơ tối thiểu. */
export function CompleteProfileForm({ prefill, isPending, onSubmit }: CompleteProfileFormProps) {
  const form = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { username: '', displayName: prefill.displayName, dateOfBirth: '', phone: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tạo tài khoản cho <span className="font-semibold text-foreground">{prefill.email}</span>
        </p>
        <FormField
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="signup-username" className="text-sm">Tên đăng nhập</label>
              <Input id="signup-username" autoComplete="username" placeholder="huytq" error={fieldState.error?.message} className={FIELD_CLASS} {...field} />
            </div>
          )}
        />
        <FormField
          control={form.control}
          name="displayName"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="signup-display-name" className="text-sm">Tên hiển thị</label>
              <Input id="signup-display-name" autoComplete="name" error={fieldState.error?.message} className={FIELD_CLASS} {...field} />
            </div>
          )}
        />
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field, fieldState }) => (
            <DatePicker
              editable
              captionLayout="dropdown"
              label="Ngày sinh"
              placeholder="dd/mm/yyyy"
              error={fieldState.error?.message}
              fromYear={THIS_YEAR - 100}
              toYear={THIS_YEAR - 13}
              disableFutureDates
              presets={false}
              value={field.value ? new Date(`${field.value}T00:00:00`) : undefined}
              onChange={(d) => field.onChange(d instanceof Date ? format(d, 'yyyy-MM-dd') : '')}
            />
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="signup-phone" className="text-sm">Số điện thoại (tuỳ chọn)</label>
              <Input id="signup-phone" inputMode="tel" autoComplete="tel" error={fieldState.error?.message} className={FIELD_CLASS} {...field} />
            </div>
          )}
        />
        <Button type="submit" className="h-[50px] w-full rounded-full text-base font-bold" isLoading={isPending}>
          Hoàn tất
        </Button>
      </form>
    </Form>
  );
}
