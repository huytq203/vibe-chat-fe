import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyStoreNoteListView } from './MyStoreNoteListView';

vi.mock('@/features/my-store/hooks/use-query', () => ({
  useStoreMessages: () => ({ data: undefined }),
}));
vi.mock('@/features/my-store/hooks/use-mutations', () => ({
  useDeleteStoreNote: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('MyStoreNoteListView', () => {
  it('renders as a rounded floating card without a left border seam', () => {
    render(
      <MyStoreNoteListView
        type="REMINDER"
        title="Nhắc nhở"
        emptyLabel="Chưa có nhắc nhở nào"
        onBack={() => {}}
      />,
    );
    const aside = screen.getByRole('complementary');
    expect(aside).toHaveClass('rounded-2xl');
    expect(aside.className).not.toMatch(/\bborder-l\b/);
  });

  it('vẫn hiển thị tiêu đề của loại ghi chú', () => {
    render(
      <MyStoreNoteListView
        type="REMINDER"
        title="Nhắc nhở"
        emptyLabel="Chưa có nhắc nhở nào"
        onBack={() => {}}
      />,
    );
    expect(screen.getByText('Nhắc nhở')).toBeInTheDocument();
  });
});
