import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from './Dialog';

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
});
