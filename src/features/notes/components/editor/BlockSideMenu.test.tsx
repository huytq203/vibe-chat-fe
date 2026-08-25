import type { ReactElement, ReactNode } from 'react';
import { cloneElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockSideMenu } from './BlockSideMenu';

const mocks = vi.hoisted(() => ({
  block: {
    content: [{ type: 'text', text: 'Nội dung' }],
    id: 'block-1',
    type: 'paragraph',
  },
  blockDragEnd: vi.fn(),
  blockDragStart: vi.fn(),
  freezeMenu: vi.fn(),
  insertBlocks: vi.fn(() => [{ id: 'block-new', type: 'paragraph' }]),
  openSuggestionMenu: vi.fn(),
  setTextCursorPosition: vi.fn(),
  unfreezeMenu: vi.fn(),
}));

vi.mock('@blocknote/core/extensions', () => ({
  SideMenuExtension: 'side-menu-extension',
  SuggestionMenu: 'suggestion-menu-extension',
}));

vi.mock('@blocknote/react', () => ({
  BlockColorsItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  RemoveBlockItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SideMenu: ({ children }: { children: ReactNode }) => (
    <div className="bn-side-menu">{children}</div>
  ),
  TableColumnHeaderItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TableRowHeaderItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useBlockNoteEditor: () => ({
    insertBlocks: mocks.insertBlocks,
    setTextCursorPosition: mocks.setTextCursorPosition,
  }),
  useDictionary: () => ({
    drag_handle: {
      colors_menuitem: 'Màu sắc',
      delete_menuitem: 'Xóa',
      header_column_menuitem: 'Cột tiêu đề',
      header_row_menuitem: 'Hàng tiêu đề',
    },
  }),
  useExtension: (extension: string) => extension === 'side-menu-extension'
    ? {
        blockDragEnd: mocks.blockDragEnd,
        blockDragStart: mocks.blockDragStart,
        freezeMenu: mocks.freezeMenu,
        unfreezeMenu: mocks.unfreezeMenu,
      }
    : { openSuggestionMenu: mocks.openSuggestionMenu },
  useExtensionState: () => mocks.block,
}));

vi.mock('@/components/ui/dropdown-menu/DropdownMenu', () => ({
  DropdownMenu: ({ children, open }: { children: ReactNode; open: boolean }) => (
    <div>{children}{open ? <div data-testid="drag-menu-open" /> : null}</div>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ render }: { render: ReactElement }) => render,
}));

vi.mock('@/components/ui/tooltip/Tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ render }: { render: ReactElement }) => cloneElement(render),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.block.content = [{ type: 'text', text: 'Nội dung' }];
});

describe('side menu BlockNote', () => {
  it('chèn đoạn mới sau khối có nội dung rồi mở slash menu', () => {
    render(<BlockSideMenu />);

    fireEvent.click(screen.getByRole('button', { name: 'Thêm khối bên dưới' }));

    expect(mocks.insertBlocks).toHaveBeenCalledWith(
      [{ type: 'paragraph' }],
      mocks.block,
      'after',
    );
    expect(mocks.setTextCursorPosition).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'block-new' }),
    );
    expect(mocks.openSuggestionMenu).toHaveBeenCalledWith('/');
  });

  it('dùng lại khối rỗng thay vì chèn thêm khối', () => {
    mocks.block.content = [];
    render(<BlockSideMenu />);

    fireEvent.click(screen.getByRole('button', { name: 'Thêm khối bên dưới' }));

    expect(mocks.insertBlocks).not.toHaveBeenCalled();
    expect(mocks.setTextCursorPosition).toHaveBeenCalledWith(mocks.block);
    expect(mocks.openSuggestionMenu).toHaveBeenCalledWith('/');
  });

  it('bắt đầu kéo khối mà không mở menu tuỳ chọn', () => {
    render(<BlockSideMenu />);
    const handle = screen.getByRole('button', { name: 'Tuỳ chọn và di chuyển khối' });

    fireEvent.dragStart(handle, { dataTransfer: {}, clientY: 48 });

    expect(mocks.blockDragStart).toHaveBeenCalledWith(expect.any(Object), mocks.block);
    expect(screen.queryByTestId('drag-menu-open')).not.toBeInTheDocument();
    expect(mocks.freezeMenu).not.toHaveBeenCalled();
    expect(handle).toHaveClass('cursor-grabbing');
  });

  it('chỉ mở menu tuỳ chọn khi click tay nắm', () => {
    render(<BlockSideMenu />);

    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn và di chuyển khối' }));

    expect(screen.getByTestId('drag-menu-open')).toBeInTheDocument();
    expect(mocks.freezeMenu).toHaveBeenCalledTimes(1);
    expect(mocks.blockDragStart).not.toHaveBeenCalled();
  });

  it('có vùng bấm, con trỏ và nội dung tooltip đúng spec', () => {
    render(<BlockSideMenu />);

    expect(screen.getByRole('button', { name: 'Thêm khối bên dưới' }))
      .toHaveClass('size-6', 'cursor-pointer');
    expect(screen.getByRole('button', { name: 'Tuỳ chọn và di chuyển khối' }))
      .toHaveClass('size-6', 'cursor-grab');
    expect(screen.getByText('Thêm khối bên dưới')).toBeInTheDocument();
    expect(screen.getByText('Kéo để di chuyển')).toBeInTheDocument();
    expect(screen.getByText('Nhấn để mở tuỳ chọn')).toBeInTheDocument();
  });
});
