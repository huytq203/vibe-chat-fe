import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Framework7Shell } from './Framework7Shell';

vi.mock('./framework7', () => ({
  App: ({ children, touch }: { children: ReactNode; touch?: { touchRipple?: boolean } }) => (
    <div data-testid="framework7-app" data-touch-ripple={String(touch?.touchRipple)}>
      {children}
    </div>
  ),
}));

describe('Framework7Shell', () => {
  it('tắt ripple mặc định của Framework7 trên button', () => {
    render(<Framework7Shell><button type="button">Mở</button></Framework7Shell>);

    expect(screen.getByTestId('framework7-app')).toHaveAttribute('data-touch-ripple', 'false');
  });
});
