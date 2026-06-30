'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Button } from '@/components/ui/button/Button';
import { Label } from '@/components/ui/label/Label';
import { Badge } from '@/components/ui/badge/Badge';
import { useCreateProject } from '../../hooks/useCreateProject';
import { useTasksUIStore } from '../../stores/tasks-ui.store';

export function NewProjectModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createProject = useCreateProject();
  const setSelected = useTasksUIStore((s) => s.setSelectedProjectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || createProject.isPending) return;
    try {
      const project = await createProject.mutateAsync({
        name: trimmed,
        description: description.trim() || undefined,
      });
      reset();
      setSelected(project.id);
      onOpenChange(false);
    } catch {
      // Lỗi đã phản ánh qua createProject.isError; giữ form để user thử lại.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project mới</DialogTitle>
          <DialogDescription>Tạo một bảng Kanban để theo dõi công việc của nhóm.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <Input
            label="Tên project"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
            }}
            placeholder="VD: Task Management"
          />

          {/* Ngày bắt đầu/kết thúc: schema Project của task-service CHƯA có field này → để placeholder. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label muted className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Ngày bắt đầu
              </Label>
              <div className="flex h-10 items-center justify-between rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground">
                Chọn ngày
                <Badge variant="soft-primary" size="sm">
                  Sắp có
                </Badge>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label muted className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Ngày kết thúc
              </Label>
              <div className="flex h-10 items-center justify-between rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground">
                Chọn ngày
                <Badge variant="soft-primary" size="sm">
                  Sắp có
                </Badge>
              </div>
            </div>
          </div>

          <Textarea
            label="Mô tả"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn về project…"
            maxLength={2000}
            showCount
          />

          {createProject.isError && (
            <p className="text-sm text-danger">Tạo project thất bại. Vui lòng thử lại.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button isLoading={createProject.isPending} onClick={() => void handleCreate()}>
            Tạo project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
