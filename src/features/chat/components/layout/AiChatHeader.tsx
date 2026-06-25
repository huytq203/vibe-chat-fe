'use client';

import { ArrowLeft, Bot, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
type ModelOption = { label: string; value: string };

type Props = {
  model: string;
  modelOptions: ModelOption[];
  onBack: () => void;
  onModelChange: (model: string | string[]) => void;
};

export function AiChatHeader({
  model,
  modelOptions,
  onBack,
  onModelChange,
}: Props) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
      <Button variant="ghost" size="icon-sm" aria-label="Quay lại" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Bot className="h-5 w-5 text-primary" />
      <span className="font-semibold">Halo AI</span>
      <div className="ml-auto flex items-center gap-2">
        <div className="w-52">
          <ComboBox
            options={modelOptions}
            value={model}
            onValueChange={onModelChange}
            autocomplete={false}
            clearIcon={false}
          />
        </div>
      </div>
    </header>
  );
}
