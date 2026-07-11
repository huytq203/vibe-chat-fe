'use client';

import { ArrowLeft, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

type Props = {
  onBack: () => void;
};

export function AiChatHeader({ onBack }: Props) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
      <Button variant="ghost" size="icon-sm" aria-label="Quay lại" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Bot className="h-5 w-5 text-primary" />
      <span className="font-semibold">Halo AI</span>
    </header>
  );
}
