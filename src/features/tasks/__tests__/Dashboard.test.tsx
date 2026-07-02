import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';

const useProjectsInfiniteMock = vi.fn();
vi.mock('../hooks/useProjectsInfinite', () => ({
  useProjectsInfinite: () => useProjectsInfiniteMock(),
}));
vi.mock('../hooks/useBoard', () => ({ useBoard: () => ({ data: undefined, isLoading: true }) }));

import { Dashboard } from '../components/dashboard/Dashboard';

/** Bọc list project thành shape của useInfiniteQuery (1 page). */
function pagedResult(projects: Array<{ id: string; name: string }>) {
  return {
    data: {
      pages: [
        {
          data: projects.map((p) => ({ status: 'ACTIVE', isOverdue: false, ...p })),
          meta: {
            page: 1,
            limit: 5,
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

describe('Dashboard — 4 states panel Dự án', () => {
  beforeEach(() => useProjectsInfiniteMock.mockReset());

  it('loading', () => {
    useProjectsInfiniteMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Đang tải dự án…')).toBeInTheDocument();
  });

  it('error', () => {
    useProjectsInfiniteMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/không tải được/i)).toBeInTheDocument();
  });

  it('empty', () => {
    useProjectsInfiniteMock.mockReturnValue(pagedResult([]));
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/chưa có dự án/i)).toBeInTheDocument();
  });

  it('data', () => {
    useProjectsInfiniteMock.mockReturnValue(pagedResult([{ id: 'p1', name: 'Dự án A' }]));
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Dự án A')).toBeInTheDocument();
  });
});
