'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useChatUIStore, type NavSection } from '@/features/chat/stores/chat-ui.store';

/** URL ứng với từng section top-level — nguồn sự thật để section sống sót khi refresh. */
const SECTION_PATH = {
  chat: '/chat',
  'ai-full': '/ai',
  tasks: '/work',
  store: '/store',
} as const;

type SectionNav = {
  activeSection: NavSection;
  goToSection: (section: NavSection) => void;
};

/** Section top-level (chat/ai-full/tasks/store) lấy từ pathname để không mất khi F5. */
export function useSectionNav(): SectionNav {
  const pathname = usePathname();
  const router = useRouter();
  const setActiveSection = useChatUIStore((s) => s.setActiveSection);

  const isWork = pathname === '/work' || pathname.startsWith('/work/');
  const isAi = pathname === '/ai' || pathname.startsWith('/ai/');
  const isStore = pathname === '/store' || pathname.startsWith('/store/');
  const activeSection: NavSection = isWork ? 'tasks' : isAi ? 'ai-full' : isStore ? 'store' : 'chat';

  const goToSection = useCallback(
    (section: NavSection) => {
      setActiveSection(section);
      router.push(SECTION_PATH[section]);
    },
    [router, setActiveSection],
  );

  return { activeSection, goToSection };
}
