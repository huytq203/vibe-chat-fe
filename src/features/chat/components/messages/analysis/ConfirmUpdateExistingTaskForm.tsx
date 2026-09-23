'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { useConfirmUpdateExistingTask } from '@/features/chat/hooks/useConfirmSuggestion';
import type { MessageAnalysis } from '@/features/chat/types';
import { useMembers } from '@/features/tasks/hooks/useMembers';
import { useTaskDetail } from '@/features/tasks/hooks/useTaskDetail';

type Props = {
  projectId: string;
  action: MessageAnalysis['suggestedActions'][number];
  onDone: () => void;
};

export function ConfirmUpdateExistingTaskForm({ projectId, action, onDone }: Props) {
  const taskId = action.targetTaskId ?? '';
  const task = useTaskDetail(projectId, taskId);
  const members = useMembers(projectId);
  const confirm = useConfirmUpdateExistingTask(projectId, taskId);
  const [dueDateOverride, setDueDateOverride] = useState<Date | null | undefined>();
  const [assigneeId, setAssigneeId] = useState('');
  const initialDate = action.dueDate ?? task.data?.dueDate;
  const dueDate = dueDateOverride === undefined
    ? (initialDate ? parseISO(initialDate) : undefined)
    : (dueDateOverride ?? undefined);
  const memberOptions = (members.data ?? []).map((member) => ({ value: member.userId, label: member.displayName }));

  function handleSubmit() {
    if (!task.data) return;
    const assignee = members.data?.find((member) => member.userId === assigneeId);
    confirm.mutate({
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      version: task.data.version,
      ...(assignee ? { assignee } : {}),
    }, { onSuccess: onDone });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm text-foreground">
        Task đích: <strong>{task.data?.title ?? (task.isPending ? 'Đang tải...' : 'Không tìm thấy task')}</strong>
      </p>
      <DatePicker
        mode="single"
        editable
        label="Hạn chót"
        placeholder="dd/mm/yyyy"
        value={dueDate}
        onChange={(date) => setDueDateOverride(date instanceof Date ? date : null)}
      />
      <ComboBox
        label="Người phụ trách (không bắt buộc)"
        value={assigneeId}
        options={memberOptions}
        onValueChange={(value) => setAssigneeId(Array.isArray(value) ? (value[0] ?? '') : value)}
        placeholder="Chọn thành viên"
        emptyText="Không có thành viên."
      />
      <Button onClick={handleSubmit} disabled={!task.data || confirm.isPending} isLoading={confirm.isPending}>
        Xác nhận cập nhật task
      </Button>
    </div>
  );
}
