'use client';

import type { HandoffParams } from '@/features/auth/types';
import { LoginFlow } from './login/LoginFlow';

export function LoginEntry({ handoff }: { handoff: HandoffParams | null }) {
  return <LoginFlow handoff={handoff} />;
}
