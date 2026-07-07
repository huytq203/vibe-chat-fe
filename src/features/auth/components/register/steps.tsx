'use client';
import { useFormContext, useWatch } from 'react-hook-form';
import { differenceInYears, format } from 'date-fns';
import { AtSign, Lock, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import type { RegisterFormInput } from '@/features/auth/schemas';
import { PasswordStrength } from './PasswordStrength';
import { SocialLoginRow } from '../SocialLoginRow';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

/** Bước 1 — Danh tính: tên hiển thị + tên đăng nhập. */
export function StepIdentity() {
  const { control } = useFormContext<RegisterFormInput>();
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <Input
            label="Tên hiển thị"
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            icon={<User className="h-4 w-4" />}
            description="Tên này hiển thị với mọi người"
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />
      <FormField
        control={control}
        name="username"
        render={({ field, fieldState }) => (
          <Input
            label="Tên đăng nhập"
            placeholder="nguyenvana"
            autoComplete="username"
            icon={<AtSign className="h-4 w-4" />}
            description="3–50 ký tự: chữ thường, số, _ . -"
            error={fieldState.error?.message}
            {...field}
            onChange={(e) =>
              field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))
            }
          />
        )}
      />
      <SocialLoginRow label="Hoặc đăng ký nhanh với" />
    </div>
  );
}

/** Bước 2 — Liên lạc: preview avatar + email + số điện thoại. */
export function StepContact() {
  const { control } = useFormContext<RegisterFormInput>();
  const displayName = useWatch({ control, name: 'displayName' });
  const username = useWatch({ control, name: 'username' });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3.5 rounded-xl border border-border bg-muted p-3.5">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/10 text-lg font-extrabold text-primary">
          {initials(displayName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">@{username}</p>
        </div>
      </div>
      <FormField
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
            description="Dùng để đăng nhập và khôi phục tài khoản"
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />
      <FormField
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <Input
            label="Số điện thoại"
            type="tel"
            inputMode="numeric"
            placeholder="0901234567"
            autoComplete="tel"
            icon={<Phone className="h-4 w-4" />}
            description="Chỉ dùng để xác minh danh tính khi cần"
            error={fieldState.error?.message}
            {...field}
            onChange={(e) => field.onChange(e.target.value.replace(/[^\d+]/g, ''))}
          />
        )}
      />
    </div>
  );
}

/** Bước 3 — Ngày sinh: xác minh đủ 13 tuổi, kèm preview tuổi. */
export function StepBirthday() {
  const { control } = useFormContext<RegisterFormInput>();
  const dob = useWatch({ control, name: 'dateOfBirth' });
  const dobDate = dob && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? new Date(dob) : null;
  const age =
    dobDate && !Number.isNaN(dobDate.getTime()) ? differenceInYears(new Date(), dobDate) : null;
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="dateOfBirth"
        render={({ field, fieldState }) => (
          <DatePicker
            editable
            captionLayout="dropdown"
            label="Ngày sinh"
            placeholder="Chọn ngày sinh"
            description="Thông tin này được bảo mật và không hiển thị công khai"
            error={fieldState.error?.message}
            // field.value là chuỗi yyyy-MM-dd → Date (local, tránh lệch timezone khi parse).
            value={field.value ? new Date(`${field.value}T00:00:00`) : undefined}
            onChange={(d) =>
              field.onChange(d instanceof Date ? format(d, 'yyyy-MM-dd') : null)
            }
          />
        )}
      />
      {age !== null && age >= 13 && age <= 100 && (
        <div className="rounded-xl border border-border bg-muted p-3">
          <p className="text-sm font-semibold text-foreground">🎂 {age} tuổi</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Hợp lệ — thành viên từ hôm nay</p>
        </div>
      )}
    </div>
  );
}

/** Bước 4 — Bảo mật: mật khẩu + xác nhận + điều khoản. */
export function StepSecurity() {
  const { control } = useFormContext<RegisterFormInput>();
  const password = useWatch({ control, name: 'password' }) ?? '';
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <div>
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="Ít nhất 6 ký tự, có chữ hoa và số"
              autoComplete="new-password"
              icon={<Lock className="h-4 w-4" />}
              error={fieldState.error?.message}
              {...field}
            />
            <PasswordStrength password={password} />
          </div>
        )}
      />
      <FormField
        control={control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <Input
            label="Xác nhận mật khẩu"
            type="password"
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            icon={<ShieldCheck className="h-4 w-4" />}
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />
      <FormField
        control={control}
        name="agreeTerms"
        render={({ field, fieldState }) => (
          <div>
            <Checkbox
              checked={field.value}
              onCheckedChange={(v) => field.onChange(Boolean(v))}
              label="Tôi đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư"
            />
            {fieldState.error && (
              <p className="mt-1 text-xs text-danger">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />
    </div>
  );
}
