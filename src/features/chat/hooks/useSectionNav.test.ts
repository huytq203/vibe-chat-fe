import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSectionNav } from './useSectionNav';

let mockPathname = '/chat';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

describe('useSectionNav', () => {
  it.each([
    ['/chat', 'chat'],
    ['/ai', 'ai-full'],
    ['/work', 'tasks'],
    ['/notes', 'notes'],
    ['/store', 'store'],
    ['/settings', 'settings'],
    ['/notes/abc', 'notes'],
    ['/khong-ton-tai', 'chat'],
  ])('suy đúng pathname %s thành section %s', (pathname, expectedSection) => {
    mockPathname = pathname;

    const { result } = renderHook(() => useSectionNav());

    expect(result.current.activeSection).toBe(expectedSection);
  });
});
