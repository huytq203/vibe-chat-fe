import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageMenu } from './PageMenu';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/features/notes/hooks/usePageExport', () => ({
  usePageExport: () => ({ pending: null, exportPage: vi.fn() }),
}));

describe('PageMenu — menu tuỳ chọn trang', () => {
  it('mở menu hiện đủ ba mục xuất', async () => {
    render(<PageMenu pageId="page-1" pageTitle="Trang" />);

    await userEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn trang' }));

    expect(await screen.findByRole('menuitem', { name: 'Xuất Markdown' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Xuất PDF' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Xuất HTML' })).toBeInTheDocument();
  });
});
