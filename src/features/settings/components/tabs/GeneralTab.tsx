'use client';

import { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { DeleteAccountDialog, useLogout } from '@/features/auth';
import { SettingsSection } from '@/features/settings/components/SettingsSection';

/** Cài đặt chung: quản lý phiên hiện tại và vùng nguy hiểm của tài khoản. */
export function GeneralTab() {
  const logout = useLogout();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleConfirmLogout = () => {
    setLogoutOpen(false);
    logout.mutate();
  };

  return (
    <>
      <SettingsSection title="Phiên đăng nhập" desc="Quản lý phiên trên thiết bị này.">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">
              Đăng xuất khỏi thiết bị này
            </p>
            <p className="text-[12px] text-muted-foreground">
              Kết thúc phiên hiện tại. Bạn sẽ cần đăng nhập lại.
            </p>
          </div>
          <Button
            variant="danger-outline"
            size="sm"
            onClick={() => setLogoutOpen(true)}
            className="shrink-0 max-sm:h-11"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>

        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Đăng xuất khỏi HaloChat?</AlertDialogTitle>
              <AlertDialogDescription>
                Phiên đăng nhập trên thiết bị này sẽ kết thúc. Bạn sẽ cần đăng nhập
                lại để tiếp tục sử dụng.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button
                variant="ghost"
                onClick={() => setLogoutOpen(false)}
                disabled={logout.isPending}
              >
                Huỷ
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmLogout}
                isLoading={logout.isPending}
              >
                Đăng xuất
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsSection>

      <SettingsSection
        title="Vùng nguy hiểm"
        desc="Xoá tài khoản sẽ vô hiệu hoá ngay và xoá vĩnh viễn sau 7 ngày."
      >
        <div className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">Xoá tài khoản</p>
            <p className="text-[12px] text-muted-foreground">
              Hành động này không thể hoàn tác sau 7 ngày.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="shrink-0 max-sm:h-11"
          >
            <Trash2 className="h-4 w-4" />
            Xoá tài khoản
          </Button>
        </div>

        <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
      </SettingsSection>
    </>
  );
}
