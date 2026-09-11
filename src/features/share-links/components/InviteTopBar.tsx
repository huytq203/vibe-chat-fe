import { ArrowLeft } from 'lucide-react';

type Props = { title: string; onBack: () => void };

export function InviteTopBar({ title, onBack }: Props) {
  return (
    <div className="safe-area-controls sticky top-0 z-10 flex items-end justify-between border-b border-border bg-muted px-3 pb-2 pt-[calc(var(--safe-top)+0.5rem)] md:items-center md:px-4 md:py-[14px]">
      <button
        type="button"
        onClick={onBack}
        aria-label="Quay lại"
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:w-9"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </button>
      <span className="text-[15px] font-bold text-foreground">{title}</span>
      <div aria-hidden="true" className="h-11 w-11 md:h-9 md:w-9" />
    </div>
  );
}
