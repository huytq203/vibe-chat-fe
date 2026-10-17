'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';

export type RestoreInfo = { restoreToken: string; maskedEmail: string | null };

// Mã lỗi cần thông điệp riêng thay vì message chung từ BE.
const MESSAGES: Record<string, string> = {
  AUTH_ADMIN_GOOGLE_REQUIRED: 'Tài khoản quản trị chỉ đăng nhập bằng Google. Hãy dùng nút "Tiếp tục với Google".',
  AUTH_GOOGLE_EMAIL_UNVERIFIED: 'Email Google của bạn chưa được xác minh.',
  AUTH_SIGNUP_TICKET_INVALID: 'Phiên đăng ký đã hết hạn, vui lòng nhập lại email.',
};

/** Map lỗi đăng nhập → toast / mở luồng khôi phục tài khoản. */
export function useLoginError(): {
  restoreInfo: RestoreInfo | null;
  clearRestore: () => void;
  handleError: (error: unknown) => void;
} {
  const [restoreInfo, setRestoreInfo] = useState<RestoreInfo | null>(null);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.code === 'AUTH_ACCOUNT_DELETED') {
      const details = error.details as { restoreToken?: string; email?: string | null } | undefined;
      if (details?.restoreToken) {
        setRestoreInfo({ restoreToken: details.restoreToken, maskedEmail: details.email ?? null });
        return;
      }
    }
    if (error instanceof ApiError) {
      toast.error(MESSAGES[error.code] ?? error.message);
      return;
    }
    toast.error('Không thể đăng nhập. Thử lại sau.');
  }, []);

  return { restoreInfo, clearRestore: () => setRestoreInfo(null), handleError };
}
