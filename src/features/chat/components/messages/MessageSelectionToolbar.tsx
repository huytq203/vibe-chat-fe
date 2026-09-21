'use client';

import { Button } from '@/components/ui/button/Button';
import { useMessageSelectionStore } from '@/features/chat/stores/message-selection.store';

type Props = {
  conversationId: string;
  onAnalyze: (messageIds: string[]) => void;
};

export function MessageSelectionToolbar({ conversationId, onAnalyze }: Props) {
  const selection = useMessageSelectionStore();

  if (selection.conversationId !== conversationId) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
      <span className="text-sm font-medium text-foreground">
        Đã chọn {selection.selectedIds.size} tin nhắn
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={selection.exit}>
          Huỷ
        </Button>
        <Button
          size="sm"
          onClick={() => {
            const ids = [...selection.selectedIds];
            selection.exit();
            onAnalyze(ids);
          }}
        >
          Phân tích đã chọn
        </Button>
      </div>
    </div>
  );
}
