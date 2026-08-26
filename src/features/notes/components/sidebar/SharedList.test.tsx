import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSharedPages } from '@/features/notes/hooks/use-query';
import { SharedList } from './SharedList';

vi.mock('@/features/notes/hooks/use-query', () => ({
  useSharedPages: vi.fn(),
}));

const sharedPage = {
  id: 'page-1',
  workspaceId: 'ws-1',
  parentId: null,
  path: '/page-1',
  depth: 0,
  sortKey: 'a0',
  title: 'Tài liệu được chia sẻ',
  icon: null,
  coverUrl: null,
  createdBy: 'user-1',
  lastEditedBy: null,
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: '2026-08-24T00:00:00.000Z',
  deletedAt: null,
  deletedBy: null,
  deletedRootId: null,
  myRole: 'VIEW' as const,
};

function mockSharedPages(data: typeof sharedPage[]) {
  vi.mocked(useSharedPages).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useSharedPages>);
}

beforeEach(() => {
  mockSharedPages([sharedPage]);
});

describe('danh sách trang được chia sẻ với tôi', () => {
  it('hiện các trang được chia sẻ với tôi', async () => {
    render(<SharedList workspaceId="ws-1" isGuest={false} onSelectPage={vi.fn()} />);

    expect(await screen.findByText('Tài liệu được chia sẻ')).toBeInTheDocument();
  });

  it('gọi onSelectPage khi bấm một trang', async () => {
    const handleSelectPage = vi.fn();
    const user = userEvent.setup();
    render(<SharedList workspaceId="ws-1" isGuest={false} onSelectPage={handleSelectPage} />);

    await user.click(await screen.findByRole('button', { name: 'Tài liệu được chia sẻ' }));

    expect(handleSelectPage).toHaveBeenCalledWith('page-1');
  });

  it('ẩn hẳn mục khi rỗng và người dùng không phải guest', () => {
    mockSharedPages([]);

    const { container } = render(
      <SharedList workspaceId="ws-1" isGuest={false} onSelectPage={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('vẫn hiện trạng thái rỗng khi người dùng là guest', async () => {
    mockSharedPages([]);
    render(<SharedList workspaceId="ws-1" isGuest onSelectPage={vi.fn()} />);

    expect(await screen.findByText(/chưa có trang nào được chia sẻ/i)).toBeInTheDocument();
  });

  it('giữ nguyên thứ tự server trả về, không sắp lại theo sortKey', async () => {
    // Server trả theo updatedAt giảm dần. sortKey chỉ có nghĩa giữa các trang
    // cùng cha, nên sắp lại ở client sẽ ra thứ tự tuỳ tiện.
    mockSharedPages([
      { ...sharedPage, id: 'page-moi', sortKey: 'z9', title: 'Sửa gần đây' },
      { ...sharedPage, id: 'page-cu', sortKey: 'a0', title: 'Sửa lâu rồi' },
    ]);
    render(<SharedList workspaceId="ws-1" isGuest={false} onSelectPage={vi.fn()} />);

    const titles = (await screen.findAllByRole('button')).map((b) => b.textContent);
    expect(titles).toEqual(['Sửa gần đây', 'Sửa lâu rồi']);
  });
});