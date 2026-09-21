import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CommitmentGraphView } from './CommitmentGraphView';

describe('CommitmentGraphView', () => {
  it('nên hiện đủ 4 tab và mặc định mở tab Khách hàng', () => {
    renderWithProviders(<CommitmentGraphView projectId="proj-1" />);
    expect(screen.getByRole('tab', { name: 'Khách hàng' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Phạm vi' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cam kết' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Yêu cầu thay đổi' }),
    ).toBeInTheDocument();
  });

  it('nên chuyển sang tab Phạm vi khi bấm', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommitmentGraphView projectId="proj-1" />);

    await user.click(screen.getByRole('tab', { name: 'Phạm vi' }));

    expect(screen.getByRole('tab', { name: 'Phạm vi' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
