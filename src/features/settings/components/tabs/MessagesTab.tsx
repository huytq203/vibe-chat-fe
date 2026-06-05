'use client';

import { useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { useAuthStore } from '@/features/auth';
import {
  ChangeLockPasswordDialog,
  LockPasswordDialog,
  getConversationName,
  useChangeLockPassword,
  useLockedConversations,
  useRemoveLock,
  type Conversation,
} from '@/features/chat';
import { useSettingsStore } from '@/features/settings/stores/settings.store';
import { SettingsSection } from '@/features/settings/components/SettingsSection';

export function MessagesTab() {
  const lockPin = useSettingsStore((s) => s.lockPin);
  const setLockPin = useSettingsStore((s) => s.setLockPin);
  const clearLockPin = useSettingsStore((s) => s.clearLockPin);
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const { data: locked = [] } = useLockedConversations();
  const removeMut = useRemoveLock();
  const changeMut = useChangeLockPassword();

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinChangeOpen, setPinChangeOpen] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<Conversation | null>(null);
  const [changeTarget, setChangeTarget] = useState<Conversation | null>(null);

  function handleSavePin(pin: string) {
    setLockPin(pin);
    toast.success('Đã lưu mã PIN khoá nhanh');
  }

  // Đổi PIN: bắt buộc nhập đúng PIN hiện tại (PIN lưu local nên kiểm tại FE).
  function handleChangePin(current: string, next: string) {
    if (current !== lockPin) {
      toast.error('Mã PIN hiện tại không đúng');
      return;
    }
    setLockPin(next);
    toast.success('Đã đổi mã PIN');
    setPinChangeOpen(false);
  }

  function handleUnlockConfirm(password: string) {
    if (!unlockTarget) return;
    removeMut.mutate({ conversationId: unlockTarget.id, password });
    setUnlockTarget(null);
  }

  function handleChangeConfirm(currentPassword: string, newPassword: string) {
    if (!changeTarget) return;
    changeMut.mutate(
      { conversationId: changeTarget.id, currentPassword, newPassword },
      { onSuccess: () => setChangeTarget(null) },
    );
  }

  return (
    <>
      <SettingsSection
        title="Mã PIN khoá nhanh"
        desc="Đặt sẵn một mã PIN để khoá hội thoại không cần nhập lại mỗi lần."
      >
        {lockPin ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
            <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-[13px] text-foreground">Đã đặt mã PIN</span>
            <Button variant="ghost" size="sm" onClick={() => setPinChangeOpen(true)}>Đổi</Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              onClick={() => { clearLockPin(); toast.success('Đã xoá mã PIN'); }}
            >
              Xoá
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setPinDialogOpen(true)}>
            <KeyRound className="mr-1.5 h-4 w-4" /> Đặt mã PIN
          </Button>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          PIN lưu trên thiết bị này (không mã hoá) — chỉ dùng cho tiện lợi khoá/ẩn hội thoại.
        </p>
      </SettingsSection>

      <SettingsSection title="Hội thoại đang khoá" desc="Đổi mật khẩu hoặc tắt khoá từng hội thoại.">
        {locked.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">Chưa có hội thoại nào bị khoá.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {locked.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2"
              >
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                  {getConversationName(conv, meId)}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setChangeTarget(conv)}>
                  Đổi mật khẩu
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onClick={() => setUnlockTarget(conv)}
                >
                  Tắt khoá
                </Button>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <LockPasswordDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        mode="lock"
        onConfirm={handleSavePin}
      />
      <LockPasswordDialog
        open={unlockTarget !== null}
        onOpenChange={(v) => { if (!v) setUnlockTarget(null); }}
        mode="unlock"
        onConfirm={handleUnlockConfirm}
      />
      <ChangeLockPasswordDialog
        open={changeTarget !== null}
        onOpenChange={(v) => { if (!v) setChangeTarget(null); }}
        onConfirm={handleChangeConfirm}
        isPending={changeMut.isPending}
      />
      <ChangeLockPasswordDialog
        open={pinChangeOpen}
        onOpenChange={setPinChangeOpen}
        onConfirm={handleChangePin}
        label="mã PIN"
      />
    </>
  );
}
