import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './Tooltip';

describe('TooltipContent', () => {
  it('renders its floating layer above fixed navigation docks', async () => {
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>Điều hướng</TooltipTrigger>
        <TooltipContent>AI Chat</TooltipContent>
      </Tooltip>,
    );

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.parentElement).toHaveClass('z-[var(--z-popover)]');
  });
});
