'use client';

import { useState } from 'react';
import { canUseBrowserLogin } from '@/lib/electron';
import type { HandoffParams } from '@/features/auth/types';
import { DesktopLoginPanel } from './DesktopLoginPanel';
import { LoginFlow } from './login/LoginFlow';

export function LoginEntry({ handoff }: { handoff: HandoffParams | null }) {
  // Đọc 1 lần ở client — preload không đổi trong vòng đời trang.
  const [isDesktop] = useState(canUseBrowserLogin);
  return isDesktop ? <DesktopLoginPanel /> : <LoginFlow handoff={handoff} />;
}
