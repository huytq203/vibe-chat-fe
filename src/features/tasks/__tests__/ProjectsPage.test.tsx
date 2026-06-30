import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';

const useProjectsMock = vi.fn();
vi.mock('../hooks/useProjects', () => ({ useProjects: () => useProjectsMock() }));
vi.mock('../hooks/useBoard', () => ({ useBoard: () => ({ data: undefined, isLoading: true }) }));
vi.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));

import { ProjectsPage } from '../components/projects/ProjectsPage';

describe('ProjectsPage — 4 states', () => {
  beforeEach(() => useProjectsMock.mockReset());

  // it('loading', () => {
  //   useProjectsMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
  //   renderWithProviders(<ProjectsPage />);
  //   expect(screen.getByRole('status')).toBeInTheDocument();
  // });

  it('error', () => {
    useProjectsMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText(/không tải được/i)).toBeInTheDocument();
  });

  it('empty', () => {
    useProjectsMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText(/chưa có dự án/i)).toBeInTheDocument();
  });

  it('data', () => {
    useProjectsMock.mockReturnValue({ data: [{ id: 'p1', name: 'Alpha' }], isLoading: false, isError: false });
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
