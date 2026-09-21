import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MessageAnalysis } from '@/features/chat/types';
import { MessageAnalysisPreview } from './MessageAnalysisPreview';

const baseAnalysis: MessageAnalysis = {
  classification: 'SCOPE_CHANGE',
  scopeStatus: 'OUT_OF_SCOPE',
  summary: 'Khách hàng yêu cầu thêm báo cáo ngoài phạm vi.',
  reasoning: 'Yêu cầu mới không có trong cam kết hiện tại.',
  confidence: 0.86,
  clarifyingQuestion: 'Có đưa yêu cầu này vào đợt hiện tại không?',
  suggestedActions: [{
    type: 'CREATE_CHANGE_REQUEST',
    title: 'Tạo yêu cầu thay đổi',
    description: 'Ghi nhận phạm vi và tác động.',
    targetCommitmentId: null,
  }],
  source: {
    conversationId: '11111111-1111-4111-8111-111111111111',
    messageIds: ['22222222-2222-4222-8222-222222222222'],
  },
};

describe('MessageAnalysisPreview', () => {
  it('nên hiển thị kết quả và đề xuất có cấu trúc', () => {
    render(<MessageAnalysisPreview analysis={baseAnalysis} projectId="proj-1" />);

    expect(screen.getByText('Thay đổi phạm vi')).toBeInTheDocument();
    expect(screen.getByText('Ngoài phạm vi')).toBeInTheDocument();
    expect(screen.getByText('Độ tin cậy 86%')).toBeInTheDocument();
    expect(screen.getByText('Tạo yêu cầu thay đổi')).toBeInTheDocument();
  });

  it('nên hiển thị empty state khi không có đề xuất', () => {
    render(
      <MessageAnalysisPreview
        analysis={{ ...baseAnalysis, suggestedActions: [] }}
        projectId="proj-1"
      />,
    );

    expect(screen.getByText('Chưa có hành động phù hợp.')).toBeInTheDocument();
  });
});
