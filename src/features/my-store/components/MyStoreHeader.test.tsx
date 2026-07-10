import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MyStoreHeader } from './MyStoreHeader';

describe('MyStoreHeader', () => {
  it('renders as a rounded floating card without a bottom border seam', () => {
    const { container } = render(<MyStoreHeader activeTab="notes" onTabChange={() => {}} />);
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('rounded-2xl');
    expect(header.className).not.toMatch(/\bborder-b\b/);
  });

  it('gọi onTabChange với "files" khi bấm tab File', () => {
    const onTabChange = vi.fn();
    render(<MyStoreHeader activeTab="notes" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('button', { name: /File/i }));
    expect(onTabChange).toHaveBeenCalledWith('files');
  });
});
