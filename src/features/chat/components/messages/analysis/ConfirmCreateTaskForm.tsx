'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useConfirmCreateTask } from '@/features/chat/hooks/useConfirmSuggestion';
import type { MessageAnalysis } from '@/features/chat/types';
import { tasksApi } from '@/features/tasks/services/tasks.api';

type Props = {
  projectId: string;
  action: MessageAnalysis['suggestedActions'][number];
  onDone: () => void;
};

export function ConfirmCreateTaskForm({ projectId, action, onDone }: Props) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(action.title);
  const [description, setDescription] = useState(action.description);
  const [dueDate, setDueDate] = useState<Date | undefined>(() => action.dueDate ? parseISO(action.dueDate) : undefined);
  const [columnId, setColumnId] = useState('');
  const board = useQuery({
    queryKey: ['tasks', projectId, 'board'],
    queryFn: () => tasksApi.getBoard(projectId),
  });
  const confirm = useConfirmCreateTask(projectId);

  const columnOptions = (board.data?.columns ?? []).map((column) => ({
    value: column.id,
    label: column.name,
  }));

  function handleSubmit() {
    confirm.mutate(
      {
        title,
        description,
        ...(dueDate ? { dueDate: format(dueDate, 'yyyy-MM-dd') } : {}),
        columnId,
        idempotencyKey,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Input
        label="Tiêu đề task"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <Textarea
        label="Mô tả"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <DatePicker
        mode="single"
        editable
        label="Hạn chót"
        placeholder="dd/mm/yyyy"
        value={dueDate}
        onChange={(date) => setDueDate(date instanceof Date ? date : undefined)}
      />
      <ComboBox
        label="Cột trên board"
        value={columnId}
        options={columnOptions}
        onValueChange={(value) =>
          setColumnId(Array.isArray(value) ? (value[0] ?? '') : value)
        }
        placeholder={board.isPending ? 'Đang tải...' : 'Chọn cột'}
        emptyText="Chưa có cột nào trên board."
      />
      <Button
        onClick={handleSubmit}
        disabled={!title.trim() || !columnId}
        isLoading={confirm.isPending}
      >
        Xác nhận tạo task
      </Button>
    </div>
  );
}
