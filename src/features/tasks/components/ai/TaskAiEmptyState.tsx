import { AiMascot } from '@/components/common/BrandAssets';
import { Button } from '@/components/ui/button/Button';

const SUGGESTIONS = [
  'Tiến độ tuần này của tôi?',
  'Tôi có những task nào?',
  'Tôi tổng kết báo cáo tuần.',
] as const;

interface TaskAiEmptyStateProps {
  onPick: (prompt: string) => void;
}

export function TaskAiEmptyState({ onPick }: TaskAiEmptyStateProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-8 text-center">
      <AiMascot className="size-28 drop-shadow-[0_14px_22px_rgb(61_31_91/0.14)]" alt="" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Bạn muốn xử lý việc gì?</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Chọn một gợi ý hoặc nhập yêu cầu cho Halo AI.
        </p>
      </div>
      <div className="flex w-full max-w-[260px] flex-col gap-2">
        {SUGGESTIONS.map((prompt) => (
          <Button
            key={prompt}
            size="sm"
            variant="secondary"
            className="h-auto min-h-10 w-full justify-start whitespace-normal rounded-xl px-4 py-2.5 text-left leading-snug"
            onClick={() => onPick(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
