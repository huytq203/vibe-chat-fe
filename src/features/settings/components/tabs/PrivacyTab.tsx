'use client';

import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { useMe, useUpdateMe } from '@/features/auth';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { SettingSwitchRow } from '@/features/settings/components/SettingSwitchRow';

/**
 * Quyền riêng tư & bảo mật. Hiện có: chế độ hiển thị hồ sơ (xem 30-profile-visibility.md).
 * PRIVATE → ẩn khỏi tìm kiếm, chỉ tiếp cận qua link/QR chia sẻ.
 */
export function PrivacyTab() {
  const { data: me, isLoading } = useMe();
  const updateMe = useUpdateMe();

  const isPrivate = me?.visibility === 'PRIVATE';

  function handleToggle(next: boolean) {
    updateMe.mutate(
      { visibility: next ? 'PRIVATE' : 'PUBLIC' },
      {
        onSuccess: () =>
          toast.success(next ? 'Hồ sơ đã chuyển sang riêng tư' : 'Hồ sơ đã công khai'),
        onError: (e) =>
          toast.error(e instanceof ApiError ? e.message : 'Cập nhật quyền riêng tư thất bại'),
      },
    );
  }

  return (
    <SettingsSection
      title="Quyền riêng tư & bảo mật"
      desc="Kiểm soát ai có thể tìm thấy hồ sơ của bạn."
    >
      <SettingSwitchRow
        icon={<Lock className="h-4 w-4" />}
        label="Hồ sơ riêng tư"
        subtitle="Ẩn khỏi tìm kiếm — người khác chỉ kết bạn được qua link/QR chia sẻ"
        checked={isPrivate}
        disabled={isLoading || updateMe.isPending}
        onChange={handleToggle}
      />
    </SettingsSection>
  );
}
