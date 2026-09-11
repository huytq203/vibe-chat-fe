'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';

export function FloatingAiButton() {
  const isSidePanelOpen = useNotesUiStore((state) => state.isSidePanelOpen);
  const setSidePanelOpen = useNotesUiStore((state) => state.setSidePanelOpen);
  const setSidePanelTab = useNotesUiStore((state) => state.setSidePanelTab);

  function openAiPanel() {
    setSidePanelTab('ai');
    setSidePanelOpen(true);
  }

  if (isSidePanelOpen) return null;

  return (
    <Button
      size="icon"
      className="absolute bottom-6 right-6 z-10 hidden size-11 rounded-xl shadow-subtle md:inline-flex"
      aria-controls="notes-side-panel"
      aria-expanded="false"
      aria-label="Mở trợ lý AI"
      title="Mở trợ lý AI"
      onClick={openAiPanel}
    >
      <Sparkles aria-hidden="true" className="size-5" />
    </Button>
  );
}
