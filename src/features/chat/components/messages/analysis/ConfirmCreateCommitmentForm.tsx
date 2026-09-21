'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useConfirmCreateCommitment } from '@/features/chat/hooks/useConfirmSuggestion';
import { buildSourceRefFromAnalysis } from '@/features/chat/lib/message-analysis';
import type { MessageAnalysis } from '@/features/chat/types';
import { useMembers } from '@/features/tasks/hooks/useMembers';

type Props = {
  projectId: string;
  action: MessageAnalysis['suggestedActions'][number];
  scopeStatus: MessageAnalysis['scopeStatus'];
  source: MessageAnalysis['source'];
  onDone: () => void;
};

export function ConfirmCreateCommitmentForm({
  projectId,
  action,
  scopeStatus,
  source,
  onDone,
}: Props) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(action.title);
  const [description, setDescription] = useState(action.description);
  const [ownerId, setOwnerId] = useState('');
  const [dueAt, setDueAt] = useState<Date | undefined>();
  const members = useMembers(projectId);
  const confirm = useConfirmCreateCommitment(projectId);

  const memberOptions = (members.data ?? []).map((member) => ({
    value: member.userId,
    label: member.displayName,
  }));

  function handleSubmit() {
    confirm.mutate(
      {
        title,
        description,
        scopeStatus,
        ...(ownerId ? { ownerId } : {}),
        ...(dueAt ? { dueAt: dueAt.toISOString() } : {}),
        sourceRefs: [buildSourceRefFromAnalysis(source)],
        idempotencyKey,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Input
        label="Tiêu đề cam kết"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <Textarea
        label="Mô tả"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <ComboBox
        label="Người chịu trách nhiệm (không bắt buộc)"
        value={ownerId}
        options={memberOptions}
        onValueChange={(value) =>
          setOwnerId(Array.isArray(value) ? (value[0] ?? '') : value)
        }
        placeholder="Chọn thành viên"
        emptyText="Không có thành viên."
      />
      <DatePicker
        mode="single"
        editable
        label="Hạn hoàn thành (không bắt buộc)"
        placeholder="dd/mm/yyyy"
        value={dueAt}
        onChange={(date) => setDueAt(date instanceof Date ? date : undefined)}
      />
      <Button
        onClick={handleSubmit}
        disabled={!title.trim()}
        isLoading={confirm.isPending}
      >
        Xác nhận tạo cam kết
      </Button>
    </div>
  );
}
