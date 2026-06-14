'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Lock, Unlock } from 'lucide-react';

type LockPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'lock' = đặt password mới | 'unlock' = nhập password để tắt lock */
  mode: 'lock' | 'unlock';
  onConfirm: (password: string) => void;
};

export function LockPasswordDialog({ open, onOpenChange, mode, onConfirm }: LockPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleClose() {
    setPassword('');
    setError('');
    onOpenChange(false);
  }

  function handleSubmit() {
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password.length > 50) {
      setError('Mật khẩu tối đa 50 ký tự');
      return;
    }
    onConfirm(password);
    handleClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === 'lock' ? <span className='flex items-center gap-2'><Lock className="h-6 w-6" /> Khóa cuộc hội thoại</span> : <span className='flex items-center gap-2'><Unlock className="h-6 w-6" /> Tắt khóa hội thoại</span>}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === 'lock'
              ? 'Đặt mật khẩu để khoá hội thoại này. Khoá sẽ ẩn hội thoại khỏi danh sách chính.'
              : 'Nhập mật khẩu hiện tại để tắt khoá.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 px-1 py-1">
          <Input
            type="password"
            placeholder="Mật khẩu (6–50 ký tự)"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            autoFocus
          />
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" onClick={handleClose}>Huỷ</Button>
          <Button variant="solid" onClick={handleSubmit}>
            {mode === 'lock' ? 'Khoá' : 'Tắt khoá'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
