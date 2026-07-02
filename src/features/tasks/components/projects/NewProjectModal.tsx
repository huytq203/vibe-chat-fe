'use client';

import { useState } from 'react';
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Ràng buộc business: ngày kết thúc phải >= ngày bắt đầu (so sánh chuỗi yyyy-MM-dd là đủ)
  const dateError =
    startDate && endDate && endDate < startDate
      ? 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu'
      : undefined;

  const reset = () => {
    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || createProject.isPending || dateError) return;
    try {
      const project = await createProject.mutateAsync({
        name: trimmed,
        description: description.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
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

          <div className="grid grid-cols-2 items-start gap-3">
            <Input
              label="Ngày bắt đầu"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Ngày kết thúc"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={dateError}
            />
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
          <Button
            isLoading={createProject.isPending}
            disabled={!!dateError}
            onClick={() => void handleCreate()}
          >
            Tạo project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
