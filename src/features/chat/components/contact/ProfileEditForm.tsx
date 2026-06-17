'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import type { UpdateMeInput, AuthUser } from '@/features/auth';
import { ProfileImageUploader } from './ProfileImageUploader';

/** Chuỗi yyyy-MM-dd → Date (local, tránh lệch timezone do parse UTC). */
function toDate(value?: string | null): Date | undefined {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
] as const;
const selectCls =
  'rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none w-full';

type ProfileEditFormProps = {
  form: UseFormReturn<UpdateMeInput>;
  me: AuthUser | undefined;
  isPending: boolean;
  onSubmit: (data: UpdateMeInput) => void;
  onCancel: () => void;
};

/** Màn hình chỉnh sửa hồ sơ: ảnh bìa, avatar, tên hiển thị, giới thiệu, giới tính, ngày sinh. */
export function ProfileEditForm({ form, me, isPending, onSubmit, onCancel }: ProfileEditFormProps) {
  return (
    <div className="w-1/2 shrink-0">
      <div className="relative mb-4 flex items-center justify-center px-6 pt-6">
        <Button type="button" variant="ghost" size="icon-sm" className="absolute left-4" onClick={onCancel} aria-label="Quay lại">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-base font-bold">Cập nhật thông tin cá nhân</span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Ảnh bìa + avatar: upload trực tiếp → ghi mediaId vào form (chỉ gửi khi đổi). */}
          <div className="relative">
            <ProfileImageUploader
              variant="cover"
              value={me?.coverUrl ?? null}
              disabled={isPending}
              onUploaded={(id) => form.setValue('coverMediaId', id, { shouldDirty: true })}
            />
            <div className="-mt-10 flex justify-center">
              <ProfileImageUploader
                variant="avatar"
                value={me?.avatarUrl ?? null}
                name={me?.displayName ?? me?.username}
                seed={me?.id ?? 'me'}
                disabled={isPending}
                onUploaded={(id) => form.setValue('avatarMediaId', id, { shouldDirty: true })}
              />
            </div>
          </div>

          <div className="space-y-5 px-6 pb-6">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field, fieldState }) => (
                <Input label="Tên hiển thị" placeholder="Nhập tên hiển thị" error={fieldState.error?.message} {...field} />
              )}
            />

            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Input
                  label="Số điện thoại"
                  type="tel"
                  placeholder="VD: 0901234567"
                  error={fieldState.error?.message}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              )}
            />

            <Controller
              name="bio"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Giới thiệu bản thân</label>
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="Vài dòng về bạn…"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    className={`${selectCls} resize-none`}
                  />
                  {fieldState.error?.message && (
                    <p className="text-[11px] text-destructive">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />

            <div className="space-y-3">
              <p className="text-sm font-bold">Thông tin cá nhân</p>
              <Controller
                name="gender"
                control={form.control}
                render={({ field }) => (
                  <div className="flex gap-6">
                    {GENDER_OPTIONS.map(({ value, label }) => (
                      <label key={value} className="flex cursor-pointer items-center gap-2">
                        <input type="radio" className="h-4 w-4 accent-primary" checked={field.value === value} onChange={() => field.onChange(value)} />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              />

              <Controller
                name="dateOfBirth"
                control={form.control}
                render={({ field }) => (
                  <DatePicker
                    label="Ngày sinh"
                    placeholder="Chọn ngày sinh"
                    captionLayout="dropdown"
                    value={toDate(field.value)}
                    onChange={(d) =>
                      field.onChange(d instanceof Date ? format(d, 'yyyy-MM-dd') : null)
                    }
                  />
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>Huỷ</Button>
              <Button type="submit" variant="solid" isLoading={isPending}>Cập nhật</Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
