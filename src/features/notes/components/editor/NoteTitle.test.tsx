import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUpdatePage } from '@/features/notes/hooks/use-mutations';
import { YDoc } from '@/lib/collab';

import { NoteTitle } from './NoteTitle';

const page = { id: 'page-1', workspaceId: 'workspace-1', parentId: null };

function renderTitle(ui: ReactNode) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mocks = vi.hoisted(() => ({
  useUpdatePage: vi.fn(),
}));

vi.mock('@/features/notes/hooks/use-mutations', () => ({
  useUpdatePage: mocks.useUpdatePage,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tiêu đề ghi chú cộng tác', () => {
  it('ghi trực tiếp vào Y.Text và không gọi mutation cập nhật trang', async () => {
    const doc = new YDoc();
    const user = userEvent.setup();
    renderTitle(<NoteTitle doc={doc} editable onMoveToBody={vi.fn()} page={page} />);

    await user.type(screen.getByRole('textbox', { name: 'Tiêu đề trang' }), 'Kế hoạch mới');

    expect(doc.getText('title').toString()).toBe('Kế hoạch mới');
    expect(vi.mocked(useUpdatePage)).not.toHaveBeenCalled();
  });

  it('đồng bộ thay đổi tiêu đề sang hai vùng đang mở cùng Y.Doc', async () => {
    const doc = new YDoc();
    const user = userEvent.setup();
    renderTitle(
      <>
        <NoteTitle doc={doc} editable onMoveToBody={vi.fn()} page={page} />
        <NoteTitle doc={doc} editable onMoveToBody={vi.fn()} page={page} />
      </>,
    );

    const [firstTitle, secondTitle] = screen.getAllByRole('textbox', {
      name: 'Tiêu đề trang',
    });
    await user.type(firstTitle, 'Tiêu đề chung');

    expect(secondTitle).toHaveValue('Tiêu đề chung');
  });

  it('nhận thay đổi từ Y.Text và hiện placeholder khi rỗng', () => {
    const doc = new YDoc();
    renderTitle(<NoteTitle doc={doc} editable onMoveToBody={vi.fn()} page={page} />);
    const title = screen.getByPlaceholderText('Không có tiêu đề');

    act(() => doc.getText('title').insert(0, 'Tiêu đề từ tab khác'));

    expect(title).toHaveValue('Tiêu đề từ tab khác');
  });

  it('chuyển xuống thân bài bằng cả Enter và Tab', async () => {
    const doc = new YDoc();
    const onMoveToBody = vi.fn();
    const user = userEvent.setup();
    renderTitle(<NoteTitle doc={doc} editable onMoveToBody={onMoveToBody} page={page} />);
    const title = screen.getByRole('textbox', { name: 'Tiêu đề trang' });

    await user.click(title);
    await user.keyboard('{Enter}{Tab}');

    expect(onMoveToBody).toHaveBeenCalledTimes(2);
  });

  it('không cho sửa tiêu đề ở chế độ chỉ đọc', () => {
    const doc = new YDoc();
    renderTitle(
      <NoteTitle doc={doc} editable={false} onMoveToBody={vi.fn()} page={page} />,
    );

    expect(screen.getByRole('textbox', { name: 'Tiêu đề trang' })).toHaveAttribute('readonly');
  });
});
