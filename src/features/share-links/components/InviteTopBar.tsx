import { ArrowLeft, MoreHorizontal } from 'lucide-react';

type Props = { title: string; onBack: () => void };

export function InviteTopBar({ title, onBack }: Props) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-muted px-4 py-[14px]">
      <button
        type="button"
        onClick={onBack}
        aria-label="Quay lại"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </button>
      <span className="text-[15px] font-bold text-foreground">{title}</span>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
        <MoreHorizontal className="h-[18px] w-[18px]" />
      </div>
    </div>
  );
}
