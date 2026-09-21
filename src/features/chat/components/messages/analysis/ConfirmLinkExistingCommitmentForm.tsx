'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { useConfirmLinkExistingCommitment } from '@/features/chat/hooks/useConfirmSuggestion';
import { buildSourceRefFromAnalysis } from '@/features/chat/lib/message-analysis';
import type { MessageAnalysis } from '@/features/chat/types';
import { commitmentsApi } from '@/features/tasks/services/commitments.api';

type Props = {
  projectId: string;
  action: MessageAnalysis['suggestedActions'][number];
  source: MessageAnalysis['source'];
  onDone: () => void;
};

export function ConfirmLinkExistingCommitmentForm({
  projectId,
  action,
  source,
  onDone,
}: Props) {
  const [commitmentId, setCommitmentId] = useState(
    action.targetCommitmentId ?? '',
  );
  const list = useQuery({
    queryKey: ['tasks', projectId, 'commitments', 'list'],
    queryFn: () => commitmentsApi.list(projectId),
  });
  const confirm = useConfirmLinkExistingCommitment();

  const options = (list.data?.data ?? []).map((commitment) => ({
    value: commitment.id,
    label: commitment.title,
  }));

  function handleSubmit() {
    confirm.mutate(
      { commitmentId, sourceRef: buildSourceRefFromAnalysis(source) },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <ComboBox
        label="Chọn cam kết có sẵn"
        value={commitmentId}
        options={options}
        onValueChange={(value) =>
          setCommitmentId(Array.isArray(value) ? (value[0] ?? '') : value)
        }
        placeholder={list.isPending ? 'Đang tải...' : 'Tìm cam kết'}
        emptyText="Không có cam kết nào trong project."
      />
      <Button
        onClick={handleSubmit}
        disabled={!commitmentId}
        isLoading={confirm.isPending}
      >
        Xác nhận gắn vào cam kết
      </Button>
    </div>
  );
}
