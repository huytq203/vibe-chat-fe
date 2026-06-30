import { Sparkles } from 'lucide-react';

export function SettingsPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Sparkles className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">Tính năng đang được phát triển.</p>
    </div>
  );
}
