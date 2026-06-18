'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Button } from '@/components/ui/button/Button';
import { useCreateBookmark } from '@/features/my-store/hooks/use-mutations';

type BookmarkDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function BookmarkDialog({ open, onClose }: BookmarkDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateBookmark();

  // Reset form mỗi lần mở lại (sync-during-render thay vì effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setUrl('');
      setTitle('');
      setDescription('');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    create.mutate(
      {
        url: url.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base font-bold">Lưu bookmark</DialogTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            label="URL"
            required
            type="url"
            placeholder="https://..."
            value={url}
            maxLength={2000}
            onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
          />
          <Input
            label="Tiêu đề"
            placeholder="Tên trang (tuỳ chọn)..."
            value={title}
            maxLength={200}
            onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
          <Textarea
            label="Mô tả"
            placeholder="Ghi chú ngắn về link này..."
            rows={2}
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={create.isPending}>
              Huỷ
            </Button>
            <Button type="submit" variant="solid" isLoading={create.isPending} disabled={!url.trim()}>
              Lưu bookmark
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
