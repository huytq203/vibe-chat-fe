'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import {
  getFcmToken,
  requestPushPermission,
  type PermissionState,
} from '@/lib/firebase/messaging';
import { useDeleteFcmToken, useRegisterFcmToken } from '@/features/notifications';
import { useSettingsStore } from '@/features/settings/stores/settings.store';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { SettingSwitchRow } from '@/features/settings/components/SettingSwitchRow';

function readPermission(): PermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as PermissionState;
}

export function NotificationsTab() {
  const pushEnabled = useSettingsStore((s) => s.pushEnabled);
  const setPushEnabled = useSettingsStore((s) => s.setPushEnabled);
  const registerMut = useRegisterFcmToken();
  const deleteMut = useDeleteFcmToken();
  // Component chỉ mount phía client (trong Dialog mở theo tương tác) → đọc trạng
  // thái quyền ngay ở lazy init, không cần effect, không lo SSR mismatch.
  const [perm, setPerm] = useState<PermissionState>(readPermission);
  const [busy, setBusy] = useState(false);

  const unsupported = perm === 'unsupported';
  const checked = pushEnabled && perm === 'granted';

  async function handleToggle(next: boolean) {
    if (busy || unsupported) return;
    setBusy(true);
    try {
      if (next) {
        const granted = await requestPushPermission();
        setPerm(granted);
        if (granted !== 'granted') {
          toast.error('Trình duyệt đã chặn thông báo. Hãy bật lại trong cài đặt trình duyệt.');
          return;
        }
        const token = await getFcmToken();
        if (token) await registerMut.mutateAsync({ token, deviceType: 'WEB', userAgent: navigator.userAgent });
        setPushEnabled(true);
        toast.success('Đã bật thông báo đẩy');
      } else {
        const token = await getFcmToken();
        if (token) await deleteMut.mutateAsync(token);
        setPushEnabled(false);
        toast.success('Đã tắt thông báo đẩy trên thiết bị này');
      }
    } catch {
      toast.error('Không cập nhật được thông báo, thử lại sau');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsSection title="Thông báo" desc="Quản lý thông báo đẩy trên thiết bị này.">
      <SettingSwitchRow
        icon={<Bell className="h-4 w-4" />}
        label="Thông báo đẩy"
        subtitle={
          unsupported
            ? 'Trình duyệt không hỗ trợ thông báo đẩy'
            : perm === 'denied'
              ? 'Đang bị trình duyệt chặn — bật lại trong cài đặt trình duyệt'
              : 'Nhận thông báo tin nhắn mới khi không mở tab'
        }
        checked={checked}
        disabled={unsupported || busy}
        onChange={handleToggle}
      />
    </SettingsSection>
  );
}
