'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Button } from '@/components/ui/button/Button';
import { useCreateReminder } from '@/features/my-store/hooks/use-mutations';

type ReminderDialogProps = {
  open: boolean;
  onClose: () => void;
};

/** Giá trị cho input datetime-local (giờ địa phương, không phải UTC). */
function toLocalInput(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function defaultRemindAt(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30);
  return toLocalInput(d);
}

export function ReminderDialog({ open, onClose }: ReminderDialogProps) {
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState(defaultRemindAt);
  const [note, setNote] = useState('');
  const create = useCreateReminder();

  // Reset form mỗi lần mở lại (sync-during-render thay vì effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle('');
      setRemindAt(defaultRemindAt());
      setNote('');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;
    create.mutate(
      { title: title.trim(), remindAt: new Date(remindAt).toISOString(), note: note.trim() || undefined },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base font-bold">Tạo nhắc nhở</DialogTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            label="Tiêu đề"
            required
            placeholder="Nhắc nhở về..."
            value={title}
            maxLength={200}
            onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
          <Input
            label="Thời điểm nhắc"
            required
            type="datetime-local"
            value={remindAt}
            min={toLocalInput(new Date())}
            onChange={(e) => setRemindAt((e.target as HTMLInputElement).value)}
          />
          <Textarea
            label="Ghi chú"
            placeholder="Thêm ghi chú..."
            rows={3}
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={create.isPending}>
              Huỷ
            </Button>
            <Button type="submit" variant="solid" isLoading={create.isPending} disabled={!title.trim() || !remindAt}>
              Tạo nhắc nhở
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
