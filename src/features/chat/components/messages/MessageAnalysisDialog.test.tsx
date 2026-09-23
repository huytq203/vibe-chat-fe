import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MessageAnalysisDialog } from './MessageAnalysisDialog';

const analysisMock = vi.hoisted(() => ({
  isPending: true,
  mutate: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('@/features/tasks/hooks/useProjects', () => ({
  useProjects: () => ({
    data: [{ id: 'project-1', name: 'Project One' }],
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/features/chat/hooks/useAnalyzeMessages', () => ({
  useAnalyzeMessages: () => ({
    ...analysisMock,
    isError: false,
    data: undefined,
  }),
}));

function renderDialog() {
  return render(
    <MessageAnalysisDialog
      open
      onOpenChange={vi.fn()}
      conversationId="conversation-1"
      messageIds={['message-1']}
    />,
  );
}

afterEach(() => {
  vi.useRealTimers();
  analysisMock.mutate.mockClear();
  analysisMock.reset.mockClear();
});

describe('MessageAnalysisDialog khi AI đang phân tích', () => {
  it('hiện trạng thái đọc tin nhắn trong vùng aria-live và khóa nút phân tích', () => {
    renderDialog();

    const status = screen.getByText('AI đang đọc các tin nhắn đã chọn…');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'AI đang phân tích…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeEnabled();
    expect(status.parentElement?.querySelector('svg')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'AI đang phân tích…' }));
    expect(analysisMock.mutate).not.toHaveBeenCalled();
  });

  it('đổi câu sau 4 và 6 giây rồi dừng ở câu cuối', () => {
    vi.useFakeTimers();
    renderDialog();

    act(() => vi.advanceTimersByTime(3_999));
    expect(screen.getByText('AI đang đọc các tin nhắn đã chọn…')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('AI đang đối chiếu với task trong project…')).toHaveAttribute('aria-live', 'polite');

    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByText('AI đang soạn đề xuất task…')).toHaveAttribute('aria-live', 'polite');

    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText('AI đang soạn đề xuất task…')).toBeInTheDocument();
  });

  it('giữ sparkle và tắt animation khi người dùng chọn reduced motion', () => {
    renderDialog();

    const status = screen.getByText('AI đang đọc các tin nhắn đã chọn…');
    expect(status.parentElement?.querySelector('svg')).toBeInTheDocument();

    const styles = readFileSync('src/styles/index.css', 'utf8');
    expect(styles).toMatch(/\.analysis-thinking-sparkle\s*\{\s*animation:\s*analysis-thinking 250ms/);
    expect(styles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.analysis-thinking-sparkle\s*\{\s*animation:\s*none/);
  });
});
