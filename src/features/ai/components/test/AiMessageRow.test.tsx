import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { AiMessageRow } from '../AiMessageRow';
import type { AiMessage } from '@/features/ai/types';

function renderAssistant(message: AiMessage) {
  return renderWithProviders(
    <AiMessageRow
      message={message}
      index={0}
      groupedWithPrev={false}
      groupedWithNext={false}
      variant="page"
      busy={false}
      onRegenerate={vi.fn()}
      onResend={vi.fn()}
      onEdit={vi.fn()}
      onDiscard={vi.fn()}
    />,
  );
}

describe('kết quả công cụ trong tin nhắn AI', () => {
  it('nên mở đúng task khi nội dung có projectId và taskId', () => {
    renderAssistant({
      role: 'assistant',
      content: 'Đã tạo task {"projectId":"project-1","taskId":"task-1"}',
      toolNames: ['create_task'],
    });

    expect(screen.getByRole('link', { name: 'Mở app task' })).toHaveAttribute(
      'href',
      '/work?project=project-1&task=task-1',
    );
  });

  it('nên mở đúng ghi chú khi nội dung có pageId', () => {
    renderAssistant({
      role: 'assistant',
      content: 'Đã tạo trang {"pageId":"page-1","title":"Kế hoạch"}',
      toolNames: ['create_page'],
    });

    expect(screen.getByRole('link', { name: 'Mở ghi chú' })).toHaveAttribute(
      'href',
      '/notes/page-1',
    );
  });

  it('nên dùng đường dẫn dự phòng khi nội dung không có mã kết quả', () => {
    renderAssistant({
      role: 'assistant',
      content: 'Đã cập nhật công việc.',
      toolNames: ['update_task'],
    });

    expect(screen.getByRole('link', { name: 'Mở app task' })).toHaveAttribute('href', '/work');
  });

  it('nên hiển thị liên kết tải cho tệp có downloadUrl', () => {
    renderWithProviders(
      <AiMessageRow
        message={{
          role: 'user',
          content: '',
          attachments: [{
            name: 'ke-hoach.pdf',
            mimeType: 'application/pdf',
            size: 4096,
            downloadUrl: 'https://storage.test/ke-hoach.pdf',
          }],
        }}
        index={0}
        groupedWithPrev={false}
        groupedWithNext={false}
        variant="page"
        busy={false}
        onResend={vi.fn()}
        onEdit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'ke-hoach.pdf' })).toHaveAttribute(
      'href',
      'https://storage.test/ke-hoach.pdf',
    );
  });
});
