'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useChatUIStore, type NavSection } from '@/features/chat/stores/chat-ui.store';

/** URL ứng với từng section top-level — nguồn sự thật để section sống sót khi refresh. */
const SECTION_PATH = {
  chat: '/chat',
  'ai-full': '/ai',
  tasks: '/work',
  notes: '/notes',
  store: '/store',
  settings: '/settings',
} as const;

type SectionNav = {
  activeSection: NavSection;
  goToSection: (section: NavSection) => void;
};

/** Section top-level lấy từ pathname để không mất khi F5. */
export function useSectionNav(): SectionNav {
  const pathname = usePathname();
  const router = useRouter();
  const setActiveSection = useChatUIStore((s) => s.setActiveSection);

  const matchedSection = Object.entries(SECTION_PATH).find(([, path]) =>
    pathname === path || pathname.startsWith(`${path}/`),
  )?.[0] as NavSection | undefined;
  const activeSection = matchedSection ?? 'chat';

  const goToSection = useCallback(
    (section: NavSection) => {
      setActiveSection(section);
      router.push(SECTION_PATH[section]);
    },
    [router, setActiveSection],
  );

  return { activeSection, goToSection };
}
