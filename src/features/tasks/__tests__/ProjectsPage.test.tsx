import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';

const useProjectsInfiniteMock = vi.fn();
vi.mock('../hooks/useProjectsInfinite', () => ({
  useProjectsInfinite: () => useProjectsInfiniteMock(),
}));
vi.mock('../hooks/useBoard', () => ({ useBoard: () => ({ data: undefined, isLoading: true }) }));
vi.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));

import { ProjectsPage } from '../components/projects/ProjectsPage';

/** Bọc list project thành shape của useInfiniteQuery (1 page). */
function pagedResult(projects: Array<{ id: string; name: string }>) {
  return {
    data: {
      pages: [
        {
          data: projects.map((p) => ({ status: 'ACTIVE', isOverdue: false, ...p })),
          meta: {
            page: 1,
            limit: 20,
            total: projects.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      ],
    },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  };
}

describe('ProjectsPage — 4 states', () => {
  beforeEach(() => useProjectsInfiniteMock.mockReset());

  it('error', () => {
    useProjectsInfiniteMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText(/không tải được/i)).toBeInTheDocument();
  });

  it('empty', () => {
    useProjectsInfiniteMock.mockReturnValue(pagedResult([]));
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText(/chưa có dự án/i)).toBeInTheDocument();
  });

  it('data', () => {
    useProjectsInfiniteMock.mockReturnValue(pagedResult([{ id: 'p1', name: 'Alpha' }]));
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
