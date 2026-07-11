import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyStoreInfoPanel } from './MyStoreInfoPanel';

vi.mock('@/features/my-store/hooks/use-query', () => ({
  useStoreMessages: () => ({ data: undefined }),
}));
vi.mock('@/features/chat/components/contact/SharedTabs', () => ({
  SharedTabs: () => null,
}));
vi.mock('./QuotaBar', () => ({
  QuotaBar: () => null,
}));

describe('MyStoreInfoPanel', () => {
  it('renders as a rounded floating card without a left border seam', () => {
    render(<MyStoreInfoPanel conversationId="conv-1" onOpenFiles={() => {}} />);
    const aside = screen.getByRole('complementary');
    expect(aside).toHaveClass('rounded-2xl');
    expect(aside.className).not.toMatch(/\bborder-l\b/);
  });

  it('vẫn hiển thị tiêu đề Kho của tôi', () => {
    render(<MyStoreInfoPanel conversationId="conv-1" onOpenFiles={() => {}} />);
    expect(screen.getByText('Kho của tôi')).toBeInTheDocument();
  });
});
