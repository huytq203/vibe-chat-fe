'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { useCreateChecklist } from '@/features/my-store/hooks/use-mutations';

type ChecklistDialogProps = {
  open: boolean;
  onClose: () => void;
};

const MAX_ITEMS = 100;

export function ChecklistDialog({ open, onClose }: ChecklistDialogProps) {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState(['']);
  const create = useCreateChecklist();

  // Reset form mỗi lần mở lại (sync-during-render thay vì effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle('');
      setItems(['']);
    }
  }

  function addItem() {
    if (items.length >= MAX_ITEMS) return;
    setItems((prev) => [...prev, '']);
  }

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.map((s) => s.trim()).filter(Boolean);
    if (!title.trim() || validItems.length === 0) return;
    create.mutate({ title: title.trim(), items: validItems }, { onSuccess: onClose });
  }

  const canSubmit = Boolean(title.trim()) && items.some((s) => s.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[80vh] max-w-md flex-col">
        <DialogTitle className="text-base font-bold">Tạo checklist</DialogTitle>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-3">
          <Input
            label="Tiêu đề"
            required
            placeholder="Tiêu đề checklist..."
            value={title}
            maxLength={200}
            onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
          <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
            <span className="text-sm font-medium text-foreground">
              Các mục <span className="text-destructive">*</span>
            </span>
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="w-4 shrink-0 text-right text-xs text-muted-foreground">{index + 1}.</span>
                <Input
                  placeholder={`Mục ${index + 1}...`}
                  value={item}
                  maxLength={500}
                  onChange={(e) => updateItem(index, (e.target as HTMLInputElement).value)}
                />
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem(index)} aria-label="Xoá mục">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {items.length < MAX_ITEMS && (
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 py-1 pl-6 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm mục
              </button>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={create.isPending}>
              Huỷ
            </Button>
            <Button type="submit" variant="solid" isLoading={create.isPending} disabled={!canSubmit}>
              Tạo checklist
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
