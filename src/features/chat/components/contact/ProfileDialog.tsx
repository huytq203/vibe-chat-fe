'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AtSign, ChevronLeft, Mail, Pen, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { ApiError } from '@/lib/api/client';
import { useMe, useUpdateMe, updateMeSchema, type UpdateMeInput } from '@/features/auth';
import { Avatar } from '../common/Avatar';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
const selectCls =
  'rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none w-full';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { data: me, isLoading } = useMe();
  const updateMe = useUpdateMe();
  const [view, setView] = useState<'info' | 'edit'>('info');

  const form = useForm<UpdateMeInput>({
    resolver: zodResolver(updateMeSchema),
    defaultValues: { displayName: '', gender: null, dateOfBirth: null },
  });

  useEffect(() => {
    if (!open) setView('info');
  }, [open]);

  const handleOpenEdit = () => {
    form.reset({
      displayName: me?.displayName ?? '',
      gender: me?.gender ?? null,
      dateOfBirth: me?.dateOfBirth ?? null,
    });
    setView('edit');
  };

  const onSubmit = (data: UpdateMeInput) => {
    updateMe.mutate(data, {
      onSuccess: () => {
        toast.success('Cập nhật thành công!');
        setView('info');
      },
      onError: (e) => {
        toast.error(e instanceof ApiError ? e.message : 'Cập nhật thất bại. Thử lại sau.');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Thêm h-fit hoặc cố định h để tránh Dialog nhảy giật chiều cao khi trượt */}
      <DialogContent className="max-w-sm overflow-hidden p-0 transition-[height] duration-300">
        <DialogTitle className="sr-only">
          {view === 'info' ? 'Thông tin tài khoản' : 'Cập nhật thông tin cá nhân'}
        </DialogTitle>

        {/* CONTAINER CHÍNH CHỨA SLIDER */}
        <div 
          className={`flex w-[200%] transition-transform duration-500 ease-in-out ${
            view === 'info' ? 'translate-x-0' : '-translate-x-1/2'
          }`}
        >
          
          {/* ==================== MÀN HÌNH 1: INFO (BÊN TRÁI) ==================== */}
          <div className="w-1/2 shrink-0 flex flex-col justify-between">
            <div>
              <div className="h-28 bg-gradient-to-br from-primary/30 via-accent to-secondary" />
              <div className="-mt-10 flex flex-col items-center px-6 pb-2">
                {isLoading ? (
                  <Skeleton rounded="full" className="h-[72px] w-[72px]" />
                ) : (
                  <Avatar
                    name={me?.displayName ?? me?.username}
                    src={me?.avatarUrl}
                    seed={me?.id ?? 'me'}
                    size="lg"
                    className="ring-4 ring-background"
                  />
                )}
                <div className="mt-2 text-center">
                  {isLoading ? (
                    <Skeleton className="mx-auto h-5 w-40" />
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-[17px] font-bold text-foreground">
                        {me?.displayName ?? me?.username ?? '—'}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenEdit}
                        className="rounded-md p-1 transition-colors hover:bg-accent"
                      >
                        <Pen className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 pb-6 pt-3">
                <p className="mb-3 text-sm font-bold">Thông tin cá nhân</p>
                <div className="space-y-3">
                  <InfoRow icon={<AtSign className="h-4 w-4 text-muted-foreground" />} label="Tên đăng nhập" value={me?.username} isLoading={isLoading} />
                  <InfoRow icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="Email" value={me?.email} isLoading={isLoading} />
                  <InfoRow icon={<Phone className="h-4 w-4 text-muted-foreground" />} label="Điện thoại" value={me?.phone} isLoading={isLoading} />
                </div>
              </div>
            </div>
          </div>

          {/* ==================== MÀN HÌNH 2: EDIT (BÊN PHẢI) ==================== */}
          <div className="w-1/2 shrink-0 p-6">
            <div className="relative mb-4 flex items-center justify-center">
              <Button type="button" variant="ghost" size="icon-sm" className="absolute left-0" onClick={() => setView('info')} aria-label="Quay lại">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-base font-bold">Cập nhật thông tin cá nhân</span>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field, fieldState }) => (
                    <Input label="Tên hiển thị" placeholder="Nhập tên hiển thị" error={fieldState.error?.message} {...field} />
                  )}
                />

                <div className="space-y-3">
                  <p className="text-sm font-bold">Thông tin cá nhân</p>
                  <Controller
                    name="gender"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex gap-6">
                        {(['MALE', 'FEMALE'] as const).map((val) => (
                          <label key={val} className="flex cursor-pointer items-center gap-2">
                            <input type="radio" className="h-4 w-4 accent-primary" checked={field.value === val} onChange={() => field.onChange(val)} />
                            <span className="text-sm">{val === 'MALE' ? 'Nam' : 'Nữ'}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  />

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Ngày sinh</label>
                    <Controller
                      name="dateOfBirth"
                      control={form.control}
                      render={({ field }) => {
                        const [y = '', m = '', d = ''] = (field.value ?? '').split('-');
                        const combine = (newY: string, newM: string, newD: string) =>
                          field.onChange(
                            newY && newM && newD
                              ? `${newY}-${newM.padStart(2, '0')}-${newD.padStart(2, '0')}`
                              : null,
                          );
                        return (
                          <div className="grid grid-cols-3 gap-2">
                            <select value={d} onChange={(e) => combine(y, m, e.target.value)} className={selectCls}>
                              <option value="">Ngày</option>
                              {DAYS.map((v) => <option key={v} value={String(v).padStart(2, '0')}>{v}</option>)}
                            </select>
                            <select value={m} onChange={(e) => combine(y, e.target.value, d)} className={selectCls}>
                              <option value="">Tháng</option>
                              {MONTHS.map((v) => <option key={v} value={String(v).padStart(2, '0')}>{v}</option>)}
                            </select>
                            <select value={y} onChange={(e) => combine(e.target.value, m, d)} className={selectCls}>
                              <option value="">Năm</option>
                              {YEARS.map((v) => <option key={v} value={String(v)}>{v}</option>)}
                            </select>
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={() => setView('info')} disabled={updateMe.isPending}>Huỷ</Button>
                  <Button type="submit" variant="solid" isLoading={updateMe.isPending}>Cập nhật</Button>
                </div>
              </form>
            </Form>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

type InfoRowProps = {
  icon: ReactNode;
  label: string;
  value: string | null | undefined;
  isLoading: boolean;
};

function InfoRow({ icon, label, value, isLoading }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLoading ? <Skeleton className="mt-1 h-4 w-40" /> : <p className="text-sm text-foreground">{value ?? '—'}</p>}
      </div>
    </div>
  );
}