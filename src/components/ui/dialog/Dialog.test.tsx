import * as React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from './Dialog';

const desktopMatchMedia = window.matchMedia;

function useMobileViewport() {
  window.matchMedia = ((query: string) => ({
    matches: query === '(max-width: 767px)',
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = desktopMatchMedia;
  window.history.replaceState(null, '', '/');
});

describe('Dialog', () => {
  it('dims and disables a parent dialog while a nested dialog is open', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="parent-dialog">
          <DialogTitle>Parent dialog</DialogTitle>

          <Dialog open>
            <DialogContent data-testid="nested-dialog">
              <DialogTitle>Nested dialog</DialogTitle>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>,
    );

    const parent = screen.getByTestId('parent-dialog');
    const nested = screen.getByTestId('nested-dialog');

    expect(parent).toHaveAttribute('data-nested-dialog-open');
    expect(parent).toHaveClass(
      'data-[nested-dialog-open]:pointer-events-none',
      'data-[nested-dialog-open]:brightness-[0.82]',
    );
    expect(nested).not.toHaveAttribute('data-nested-dialog-open');
  });

  it('renders substantial dialogs as full mobile pages with a back bar', () => {
    useMobileViewport();
    render(
      <Dialog open>
        <DialogContent data-testid="dialog">
          <DialogTitle>Cài đặt</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByTestId('dialog')).toHaveClass('max-md:inset-0', 'max-md:rounded-none');
    expect(screen.getByText('Quay lại')).toBeInTheDocument();
    expect(screen.getByTestId('dialog').querySelector('[data-mobile-page-content]'))
      .toHaveClass('max-md:overflow-y-auto');
  });

  it('supports full-bleed mobile pages for dialogs with custom layouts', () => {
    useMobileViewport();
    render(
      <Dialog open>
        <DialogContent
          data-testid="dialog"
          mobileContentClassName="max-md:px-0 max-md:pt-0 max-md:pb-[var(--f7-safe-area-bottom)]"
        >
          <DialogTitle>Chi tiết công việc</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByTestId('dialog').querySelector('[data-mobile-page-content]'))
      .toHaveClass(
        'max-md:px-0',
        'max-md:pt-0',
        'max-md:pb-[var(--f7-safe-area-bottom)]',
      );
  });

  it('closes the mobile page when browser history goes back', () => {
    useMobileViewport();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent><DialogTitle>Cài đặt</DialogTitle></DialogContent>
      </Dialog>,
    );

    window.history.replaceState(null, '', window.location.href);
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'none' }));
  });

  it('restores a mobile dialog when browser history moves forward to its entry', async () => {
    useMobileViewport();
    function Harness() {
      const [open, setOpen] = React.useState(true);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent data-testid="dialog"><DialogTitle>Thông báo</DialogTitle></DialogContent>
        </Dialog>
      );
    }
    render(<Harness />);
    const routeState = window.history.state;

    act(() => {
      window.history.replaceState(null, '', window.location.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(screen.queryByTestId('dialog')).not.toBeInTheDocument());

    act(() => {
      window.history.replaceState(routeState, '', window.location.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(screen.getByTestId('dialog')).toBeInTheDocument());
  });

  it('keeps tiny overlays out of mobile route history', async () => {
    useMobileViewport();
    const pushState = vi.spyOn(window.history, 'pushState');
    render(
      <Dialog mobileRoute={false} defaultOpen>
        <DialogContent><DialogTitle>Thông tin ngắn</DialogTitle></DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText('Quay lại')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).not.toHaveClass('max-md:inset-0');
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(pushState).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
  });
});
