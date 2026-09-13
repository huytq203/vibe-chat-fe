'use client';

import type { ReactNode } from 'react';
import { App } from './framework7';

/**
 * Framework7 owns the installed-PWA surface and platform safe-area tokens.
 * Next App Router remains the only URL router; mounting a Framework7 View here
 * would create a second, conflicting navigation history.
 */
export function Framework7Shell({ children }: { children: ReactNode }) {
  return (
    <App
      className="halo-framework7-shell"
      name="Halo"
      theme="auto"
      touch={{ touchRipple: false }}
      // Module "clicks" của Framework7 mặc định chặn (preventDefault) mọi <a> nội bộ để
      // giao cho router của nó — ở đây không có View nên click <Link> bị "nuốt"
      // (vd. Thùng rác ở /notes). Coi mọi <a> là external để Next Link tự điều hướng.
      clicks={{ externalLinks: 'a' }}
    >
      {children}
    </App>
  );
}
