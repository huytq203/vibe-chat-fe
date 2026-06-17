'use client';

import { Lock, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { useMe, useUpdateMe } from '@/features/auth';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { SettingSwitchRow } from '@/features/settings/components/SettingSwitchRow';
import {
  usePrivacySettings,
  useUpdatePrivacy,
} from '@/features/settings/hooks/use-privacy';

/**
 * Quyền riêng tư & bảo mật:
 *  - Chế độ hiển thị hồ sơ (visibility — xem 30-profile-visibility.md).
 *  - Bảo mật dữ liệu cá nhân: 1 cờ ẩn TOÀN BỘ phone/ngày sinh/bio/giới tính khỏi
 *    người khác. Khi tắt: bio/giới tính công khai, phone & ngày sinh chỉ bạn bè thấy.
 */
export function PrivacyTab() {
  const { data: me, isLoading } = useMe();
  const updateMe = useUpdateMe();
  const { data: privacy, isLoading: privacyLoading } = usePrivacySettings();
  const updatePrivacy = useUpdatePrivacy();

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

  function handlePrivateInfo(next: boolean) {
    updatePrivacy.mutate(
      { privateInfo: next },
      {
        onSuccess: () =>
          toast.success(next ? 'Đã ẩn thông tin cá nhân' : 'Đã cho phép chia sẻ thông tin cá nhân'),
        onError: (e) =>
          toast.error(e instanceof ApiError ? e.message : 'Cập nhật cài đặt thất bại'),
      },
    );
  }

  return (
    <>
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

      <SettingsSection
        title="Bảo mật dữ liệu cá nhân"
        desc="Ẩn số điện thoại, ngày sinh, giới thiệu và giới tính khỏi người khác."
      >
        <SettingSwitchRow
          icon={<ShieldOff className="h-4 w-4" />}
          label="Ẩn thông tin cá nhân"
          subtitle="Bật → người khác không thấy SĐT, ngày sinh, bio, giới tính của bạn"
          checked={privacy?.privateInfo ?? false}
          disabled={privacyLoading || updatePrivacy.isPending}
          onChange={handlePrivateInfo}
        />
      </SettingsSection>
    </>
  );
}
