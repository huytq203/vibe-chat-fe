'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { ApiError } from '@/lib/api/client';
import { useMe, useUpdateMe, updateMeSchema, type UpdateMeInput } from '@/features/auth';
import { ProfileInfoView } from './ProfileInfoView';
import { ProfileEditForm } from './ProfileEditForm';

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
    defaultValues: {
      displayName: '',
      phone: '',
      gender: undefined,
      dateOfBirth: null,
      bio: null,
      avatarMediaId: undefined,
      coverMediaId: undefined,
      visibility: undefined,
    },
  });

  // Đóng dialog → reset về màn info để lần mở sau bắt đầu sạch (tránh setState trong effect).
  const handleDialogOpenChange = (next: boolean) => {
    if (!next) setView('info');
    onOpenChange(next);
  };

  const handleOpenEdit = () => {
    form.reset({
      displayName: me?.displayName ?? '',
      phone: me?.phone ?? '',
      gender: me?.gender ?? undefined,
      dateOfBirth: me?.dateOfBirth ?? null,
      bio: me?.bio ?? null,
      // mediaId chỉ set khi user upload ảnh mới trong phiên sửa (BE giữ ảnh cũ nếu bỏ trống).
      avatarMediaId: undefined,
      coverMediaId: undefined,
    });
    setView('edit');
  };

  const onSubmit = (data: UpdateMeInput) => {
    // Phone rỗng → null để BE xoá số (BE từ chối chuỗi rỗng vì regex).
    const payload: UpdateMeInput =
      data.phone === '' ? { ...data, phone: null } : data;
    updateMe.mutate(payload, {
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
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      {/* max-h + cuộn dọc: khi zoom to / màn thấp, nội dung không bị cắt mất.
          overflow-x-hidden vẫn clip panel trượt ngang. */}
      <DialogContent className="max-w-sm max-h-[85vh] overflow-x-hidden overflow-y-auto p-0 transition-[height] duration-300">
        <DialogTitle className="sr-only">
          {view === 'info' ? 'Thông tin tài khoản' : 'Cập nhật thông tin cá nhân'}
        </DialogTitle>

        {/* CONTAINER CHÍNH CHỨA SLIDER */}
        <div
          className={`flex w-[200%] transition-transform duration-500 ease-in-out ${
            view === 'info' ? 'translate-x-0' : '-translate-x-1/2'
          }`}
        >
          <ProfileInfoView me={me} isLoading={isLoading} onEdit={handleOpenEdit} />
          <ProfileEditForm
            form={form}
            me={me}
            isPending={updateMe.isPending}
            onSubmit={onSubmit}
            onCancel={() => setView('info')}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
