import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Page } from '@/features/notes/types';
import { usePageDrag, type PageInsideDropData } from './use-page-drag';

const mutate = vi.hoisted(() => vi.fn());

vi.mock('./use-mutations', () => ({
  useMovePage: () => ({ mutate }),
}));

function buildPage(id: string, path: string, depth: number, parentId: string | null): Page {
  return {
    id,
    workspaceId: 'workspace-1',
    parentId,
    path,
    depth,
    sortKey: 'a0',
    title: id,
    icon: null,
    coverUrl: null,
    createdBy: 'user-1',
    lastEditedBy: null,
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    deletedAt: null,
    deletedBy: null,
    deletedRootId: null,
  };
}

function createWrapper() {
  const queryClient = new QueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('luật chặn kéo thả cây trang', () => {
  it('không gọi mutation khi thả trang vào con cháu của chính nó', () => {
    const dragged = buildPage('cha', '.cha.', 1, null);
    const descendant = buildPage('chau', '.cha.con.chau.', 3, 'con');
    const drop: PageInsideDropData = { kind: 'inside', target: descendant };
    const { result } = renderHook(() => usePageDrag('workspace-1'), {
      wrapper: createWrapper(),
    });

    act(() => result.current.moveToTarget(dragged, drop));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('không gọi mutation khi cha đích đã ở cấp mười', () => {
    const dragged = buildPage('trang-keo', '.trang-keo.', 1, null);
    const target = buildPage('cap-muoi', '.a.b.c.d.e.f.g.h.i.cap-muoi.', 10, 'cap-chin');
    const drop: PageInsideDropData = { kind: 'inside', target };
    const { result } = renderHook(() => usePageDrag('workspace-1'), {
      wrapper: createWrapper(),
    });

    act(() => result.current.moveToTarget(dragged, drop));

    expect(mutate).not.toHaveBeenCalled();
  });
});
