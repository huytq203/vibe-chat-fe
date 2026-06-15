'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { DeleteAccountDialog } from '@/features/auth';
import { SettingsSection } from '@/features/settings/components/SettingsSection';

/** Cài đặt chung. Hiện có: vùng nguy hiểm — xoá tài khoản (xoá mềm 7 ngày). */
export function GeneralTab() {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
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
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4" />
          Xoá tài khoản
        </Button>
      </div>

      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </SettingsSection>
  );
}
