'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useConfirmCreateChangeRequest } from '@/features/chat/hooks/useConfirmSuggestion';
import { buildSourceRefFromAnalysis } from '@/features/chat/lib/message-analysis';
import type { MessageAnalysis } from '@/features/chat/types';

type Props = {
  projectId: string;
  action: MessageAnalysis['suggestedActions'][number];
  source: MessageAnalysis['source'];
  onDone: () => void;
};

export function ConfirmCreateChangeRequestForm({
  projectId,
  action,
  source,
  onDone,
}: Props) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(action.title);
  const [impact, setImpact] = useState(action.description);
  const [estimateHours, setEstimateHours] = useState('');
  const [cost, setCost] = useState('');
  const confirm = useConfirmCreateChangeRequest(projectId);

  function handleSubmit() {
    confirm.mutate(
      {
        title,
        impact,
        ...(action.targetCommitmentId
          ? { commitmentId: action.targetCommitmentId }
          : {}),
        ...(estimateHours ? { estimateHours: Number(estimateHours) } : {}),
        ...(cost ? { cost: Number(cost) } : {}),
        sourceRefs: [buildSourceRefFromAnalysis(source)],
        idempotencyKey,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Input
        label="Tiêu đề yêu cầu thay đổi"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <Textarea
        label="Tác động"
        value={impact}
        onChange={(event) => setImpact(event.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Số giờ ước tính (không bắt buộc)"
          type="number"
          min={0}
          value={estimateHours}
          onChange={(event) => setEstimateHours(event.target.value)}
        />
        <Input
          label="Chi phí ước tính (VND, không bắt buộc)"
          type="number"
          min={0}
          value={cost}
          onChange={(event) => setCost(event.target.value)}
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!title.trim() || !impact.trim()}
        isLoading={confirm.isPending}
      >
        Xác nhận tạo yêu cầu thay đổi
      </Button>
    </div>
  );
}
