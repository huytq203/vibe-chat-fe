import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavPosition, useSettingsStore } from '@/features/settings/stores/settings.store';
import { AppearanceTab } from './AppearanceTab';

let isMobile = false;

vi.mock('@/lib/hooks/useIsMobile', () => ({
  useIsMobile: () => isMobile,
}));

describe('NavPositionPicker', () => {
  beforeEach(() => {
    isMobile = false;
    useSettingsStore.setState({ navPosition: NavPosition.LEFT });
  });

  it('updates the persisted settings store when a position is selected', () => {
    render(<AppearanceTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Bên phải' }));

    expect(useSettingsStore.getState().navPosition).toBe(NavPosition.RIGHT);
    expect(screen.getByRole('button', { name: 'Bên phải' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('does not render the position picker on mobile', () => {
    isMobile = true;
    render(<AppearanceTab />);

    expect(screen.queryByText('Vị trí thanh điều hướng')).not.toBeInTheDocument();
  });
});
