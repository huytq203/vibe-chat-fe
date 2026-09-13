'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { AiAvatar } from '@/components/common/BrandAssets';
import { Button } from '@/components/ui/button/Button';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';

const AI_GREETINGS = [
  'Bạn có gì cần hỗ trợ không?',
  'Tôi có thể làm nhiều hơn bạn nghĩ.',
  'Chào bạn đến với Halo Notion.',
  'Ý tưởng tiếp theo của bạn là gì?',
  'Có công mài sắt, có ngày nên kim.',
  'Sàng tiền minh nguyệt quang,\nNghi thị sương thượng sương.\nCử đầu vọng minh nguyệt,\nĐê đầu tư cố hương. \nTác Giả: Lý Bạch',
] as const;

export function FloatingAiButton() {
  const isSidePanelOpen = useNotesUiStore((state) => state.isSidePanelOpen);
  const setSidePanelOpen = useNotesUiStore((state) => state.setSidePanelOpen);
  const setSidePanelTab = useNotesUiStore((state) => state.setSidePanelTab);
  const prefersReducedMotion = useReducedMotion();
  const [greetingIndex, setGreetingIndex] = useState<number | null>(null);

  function showRandomGreeting() {
    setGreetingIndex(Math.floor(Math.random() * AI_GREETINGS.length));
  }

  function openAiPanel() {
    setSidePanelTab('ai');
    setSidePanelOpen(true);
  }

  if (isSidePanelOpen) return null;

  return (
    <>
      <AnimatePresence>
        {greetingIndex !== null && (
          <motion.div
            key={greetingIndex}
            id="halo-ai-greeting"
            role="tooltip"
            initial={prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 8, scale: 0.96, filter: 'blur(4px)' }}
            animate={prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 4, scale: 0.98, filter: 'blur(2px)' }}
            transition={{
              duration: prefersReducedMotion ? 0.15 : 0.38,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="pointer-events-none absolute bottom-[84px] right-6 z-10 hidden w-max max-w-60 whitespace-pre-line rounded-xl bg-popover px-4 py-3 text-sm font-medium leading-relaxed text-popover-foreground shadow-md md:block"
          >
            {AI_GREETINGS[greetingIndex]}
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 right-4 size-3 rotate-45 bg-popover"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        variant="outline"
        size="icon"
        className="group absolute bottom-6 right-6 z-10 hidden size-12 rounded-xl bg-popover text-popover-foreground shadow-subtle transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent hover:shadow-md active:translate-y-0 motion-reduce:transform-none md:inline-flex"
        aria-controls="notes-side-panel"
        aria-describedby={greetingIndex !== null ? 'halo-ai-greeting' : undefined}
        aria-expanded="false"
        aria-label="Mở trợ lý AI"
        title="Mở trợ lý AI"
        onMouseEnter={showRandomGreeting}
        onMouseLeave={() => setGreetingIndex(null)}
        onFocus={() => {
          if (greetingIndex === null) showRandomGreeting();
        }}
        onBlur={() => setGreetingIndex(null)}
        onClick={openAiPanel}
      >
        <AiAvatar className="size-9 bg-transparent transition-transform duration-200 ease-out group-hover:scale-105 motion-reduce:transform-none" />
      </Button>
    </>
  );
}
