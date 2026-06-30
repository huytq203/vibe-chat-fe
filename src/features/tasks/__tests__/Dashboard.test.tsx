import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';

const useProjectsMock = vi.fn();
vi.mock('../hooks/useProjects', () => ({ useProjects: () => useProjectsMock() }));
vi.mock('../hooks/useBoard', () => ({ useBoard: () => ({ data: undefined, isLoading: true }) }));

import { Dashboard } from '../components/dashboard/Dashboard';

describe('Dashboard — 4 states panel Dự án', () => {
  beforeEach(() => useProjectsMock.mockReset());

  it('loading', () => {
    useProjectsMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Đang tải dự án…')).toBeInTheDocument();
  });

  it('error', () => {
    useProjectsMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/không tải được/i)).toBeInTheDocument();
  });

  it('empty', () => {
    useProjectsMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/chưa có dự án/i)).toBeInTheDocument();
  });

  it('data', () => {
    useProjectsMock.mockReturnValue({
      data: [{ id: 'p1', name: 'Dự án A' }],
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Dự án A')).toBeInTheDocument();
  });
});
