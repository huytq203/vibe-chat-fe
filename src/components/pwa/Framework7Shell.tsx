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
    >
      {children}
    </App>
  );
}
