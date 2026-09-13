import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiConversationBar } from '../AiConversationBar';

const conversations = [
  {
    id: 'tasks-1', title: 'Tiến độ', origin: 'TASKS' as const,
    context: { projectId: 'project-1' }, updatedAt: new Date().toISOString(),
  },
  {
    id: 'notes-1', title: 'Tóm tắt', origin: 'NOTES' as const,
    context: { workspaceId: 'workspace-1' }, updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

describe('thanh lịch sử hội thoại AI hợp nhất', () => {
  it('nhóm theo thời gian và hiển thị nhãn nguồn', async () => {
    render(<AiConversationBar
      conversations={conversations}
      activeId={null}
      activeTitle={null}
      currentOrigin="TASKS"
      isLoading={false}
      isError={false}
      onSelect={vi.fn()}
      onStartNew={vi.fn()}
      onRetry={vi.fn()}
    />);

    fireEvent.click(screen.getByRole('button', {
      name: 'Cuộc trò chuyện mới, mở lịch sử hội thoại',
    }));

    expect(await screen.findByText('Hôm nay')).toBeInTheDocument();
    expect(screen.getByText('Cũ hơn')).toBeInTheDocument();
    expect(screen.getByText('📋 TASKS Tiến độ')).toBeInTheDocument();
    expect(screen.getByText('📝 NOTES Tóm tắt')).toBeInTheDocument();
  });

  it('lọc theo app hiện tại khi bật tuỳ chọn', async () => {
    render(<AiConversationBar
      conversations={conversations}
      activeId={null}
      activeTitle={null}
      currentOrigin="TASKS"
      isLoading={false}
      isError={false}
      onSelect={vi.fn()}
      onStartNew={vi.fn()}
      onRetry={vi.fn()}
    />);
    fireEvent.click(screen.getByRole('button', {
      name: 'Cuộc trò chuyện mới, mở lịch sử hội thoại',
    }));

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Chỉ app này' }));

    expect(screen.getByText('📋 TASKS Tiến độ')).toBeInTheDocument();
    expect(screen.queryByText('📝 NOTES Tóm tắt')).not.toBeInTheDocument();
  });

  it('gọi xoá đúng hội thoại khi bấm nút thùng rác', async () => {
    const onDelete = vi.fn();
    render(<AiConversationBar
      conversations={conversations}
      activeId={null}
      activeTitle={null}
      currentOrigin="TASKS"
      isLoading={false}
      isError={false}
      onSelect={vi.fn()}
      onStartNew={vi.fn()}
      onDelete={onDelete}
      isDeleting={() => false}
      onRetry={vi.fn()}
    />);
    fireEvent.click(screen.getByRole('button', {
      name: 'Cuộc trò chuyện mới, mở lịch sử hội thoại',
    }));

    fireEvent.click(await screen.findByRole('button', {
      name: 'Xoá cuộc trò chuyện Tiến độ',
    }));

    expect(onDelete).toHaveBeenCalledWith('tasks-1');
  });

  it('khoá nút xoá và hiện trạng thái tải khi hội thoại đang được xoá', async () => {
    render(<AiConversationBar
      conversations={conversations}
      activeId={null}
      activeTitle={null}
      currentOrigin="TASKS"
      isLoading={false}
      isError={false}
      onSelect={vi.fn()}
      onStartNew={vi.fn()}
      onDelete={vi.fn()}
      isDeleting={(id) => id === 'tasks-1'}
      onRetry={vi.fn()}
    />);
    fireEvent.click(screen.getByRole('button', {
      name: 'Cuộc trò chuyện mới, mở lịch sử hội thoại',
    }));

    const deleteButton = await screen.findByRole('button', {
      name: 'Xoá cuộc trò chuyện Tiến độ',
    });
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toContainElement(screen.getByRole('status', { name: 'Loading' }));
  });
});
