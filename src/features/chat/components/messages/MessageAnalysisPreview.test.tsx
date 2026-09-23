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

  it('nên hiện rationale làm lời giải thích', () => {
    render(<MessageAnalysisPreview analysis={{ ...baseAnalysis, suggestedActions: [{ ...baseAnalysis.suggestedActions[0], rationale: 'Vì khách yêu cầu thêm.' }] }} projectId="proj-1" />);
    expect(screen.getByText(/Vì khách yêu cầu thêm/)).toBeInTheDocument();
    expect(screen.queryByText(/Ghi nhận phạm vi và tác động/)).not.toBeInTheDocument();
  });

  it('nên hiện description khi không có rationale', () => {
    render(<MessageAnalysisPreview analysis={baseAnalysis} projectId="proj-1" />);
    expect(screen.getByText(/Ghi nhận phạm vi và tác động/)).toBeInTheDocument();
  });

  it('nên bỏ qua gợi ý có type không nhận diện', () => {
    render(<MessageAnalysisPreview analysis={{ ...baseAnalysis, suggestedActions: [{ ...baseAnalysis.suggestedActions[0], type: 'LOAI_MOI' as MessageAnalysis['suggestedActions'][number]['type'] }] }} projectId="proj-1" />);
    expect(screen.getByText('Tạo yêu cầu thay đổi')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chọn phương án này' })).not.toBeInTheDocument();
  });
});
