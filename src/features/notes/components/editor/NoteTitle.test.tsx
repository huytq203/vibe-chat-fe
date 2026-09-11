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

  it('dùng textarea tự giãn và xuống dòng cho tiêu đề dài', () => {
    const doc = new YDoc();
    doc.getText('title').insert(
      0,
      'Kế hoạch phát hành sản phẩm với một tiêu đề rất dài cần hiển thị đầy đủ',
    );
    renderTitle(<NoteTitle doc={doc} editable onMoveToBody={vi.fn()} page={page} />);

    const title = screen.getByRole('textbox', { name: 'Tiêu đề trang' });
    expect(title.tagName).toBe('TEXTAREA');
    expect(title).toHaveAttribute('rows', '1');
    expect(title).toHaveClass(
      'resize-none',
      'overflow-hidden',
      'whitespace-pre-wrap',
      'min-h-14',
      'text-[48px]',
      'leading-14',
      '[field-sizing:content]',
      '[overflow-wrap:anywhere]',
    );
    expect(title).not.toHaveClass('md:text-[36px]', 'md:leading-11');
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

  it('undo và redo tiêu đề bằng phím tắt Windows', async () => {
    const doc = new YDoc();
    const user = userEvent.setup();
    renderTitle(<NoteTitle doc={doc} editable onMoveToBody={vi.fn()} page={page} />);
    const title = screen.getByRole('textbox', { name: 'Tiêu đề trang' });

    await user.type(title, 'Kế hoạch mới');
    await user.keyboard('{Control>}z{/Control}');
    expect(title).toHaveValue('');

    await user.keyboard('{Control>}y{/Control}');
    expect(title).toHaveValue('Kế hoạch mới');
  });

  it('hỗ trợ redo kiểu macOS và chọn toàn bộ tiêu đề', async () => {
    const doc = new YDoc();
    const user = userEvent.setup();
    renderTitle(<NoteTitle doc={doc} editable onMoveToBody={vi.fn()} page={page} />);
    const title = screen.getByRole('textbox', { name: 'Tiêu đề trang' }) as HTMLTextAreaElement;

    await user.type(title, 'Halo');
    await user.keyboard('{Meta>}z{/Meta}');
    await user.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}');
    await user.keyboard('{Control>}a{/Control}');

    expect(title).toHaveValue('Halo');
    expect(title.selectionStart).toBe(0);
    expect(title.selectionEnd).toBe(4);
  });

  it('không cho sửa tiêu đề ở chế độ chỉ đọc', () => {
    const doc = new YDoc();
    renderTitle(
      <NoteTitle doc={doc} editable={false} onMoveToBody={vi.fn()} page={page} />,
    );

    expect(screen.getByRole('textbox', { name: 'Tiêu đề trang' })).toHaveAttribute('readonly');
  });
});
