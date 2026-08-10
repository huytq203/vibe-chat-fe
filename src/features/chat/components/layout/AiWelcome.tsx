'use client';

import { ArrowUpRight, Languages, Lightbulb, MessageSquareQuote, Sparkles, TextQuote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Suggestion = {
  icon: LucideIcon;
  prompt: string;
};

const SUGGESTIONS: Suggestion[] = [
  { icon: MessageSquareQuote, prompt: 'Soạn giúp tôi tin nhắn xin nghỉ phép lịch sự' },
  { icon: TextQuote, prompt: 'Tóm tắt nội dung tôi sắp dán vào đây' },
  { icon: Languages, prompt: 'Dịch đoạn hội thoại này sang tiếng Anh tự nhiên' },
  { icon: Lightbulb, prompt: 'Gợi ý 5 ý tưởng cho buổi họp nhóm tuần này' },
];

interface AiWelcomeProps {
  onPick: (prompt: string) => void;
}

export function AiWelcome({ onPick }: AiWelcomeProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-1 py-4">
      <div className="w-full max-w-[560px] rounded-2xl border bg-sidebar/75 p-6 shadow-subtle backdrop-blur-md sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-subtle">
            <Sparkles className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-balance text-[21px] font-bold leading-tight tracking-tight text-foreground">
            Halo AI có thể giúp gì cho bạn?
          </h2>
          <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
            Hỏi bất cứ điều gì, hoặc bắt đầu từ một gợi ý bên dưới.
          </p>
        </div>

        <div className="mt-7 divide-y divide-border/60 border-y border-border/60">
          {SUGGESTIONS.map(({ icon: Icon, prompt }) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPick(prompt)}
              className="group flex w-full items-center gap-3 px-2 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary/80" />
              <span className="min-w-0 flex-1 text-[13px] leading-snug text-foreground">{prompt}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
