import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MessageAnalysis } from '@/features/chat/types';
import { messageAnalysisSchema } from '@/features/chat/types/message-analysis';
import { MessageAnalysisPreview } from './MessageAnalysisPreview';

const baseAnalysis: MessageAnalysis = {
  summary: 'Cần cập nhật trang thanh toán.',
  reasoning: 'Tin nhắn mô tả một đầu việc.',
  confidence: 0.86,
  clarifyingQuestion: null,
  suggestedActions: [{
    type: 'CREATE_TASK',
    title: 'Tạo task thanh toán',
    description: 'Cập nhật giao diện.',
  }],
  source: {
    conversationId: '11111111-1111-4111-8111-111111111111',
    messageIds: ['22222222-2222-4222-8222-222222222222'],
  },
};

describe('MessageAnalysisPreview', () => {
  it('hiển thị kết quả và đề xuất tạo task', () => {
    render(<MessageAnalysisPreview analysis={baseAnalysis} projectId="proj-1" />);
    expect(screen.getByText('Độ tin cậy 86%')).toBeInTheDocument();
    expect(screen.getByText('Tạo task thanh toán')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chọn phương án này' })).toBeInTheDocument();
  });

  it('hiển thị câu hỏi làm rõ mà không mở form', () => {
    render(<MessageAnalysisPreview analysis={{ ...baseAnalysis, suggestedActions: [{ type: 'ASK_CLARIFICATION', title: 'Cần làm rõ', description: 'Hạn chót là ngày nào?' }] }} projectId="proj-1" />);
    expect(screen.getByText('Cần làm rõ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chọn phương án này' })).not.toBeInTheDocument();
  });

  it('bỏ qua đề xuất không hỗ trợ', () => {
    const analysis = messageAnalysisSchema.parse({
      ...baseAnalysis,
      suggestedActions: [{ type: 'CREATE_CHANGE_REQUEST', title: 'Yêu cầu thay đổi', description: 'Nội dung cũ' }],
    });
    render(<MessageAnalysisPreview analysis={analysis} projectId="proj-1" />);
    expect(screen.queryByText('Yêu cầu thay đổi')).not.toBeInTheDocument();
    expect(screen.getByText('Chưa có hành động phù hợp.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chọn phương án này' })).not.toBeInTheDocument();
  });
});
