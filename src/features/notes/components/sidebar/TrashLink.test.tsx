import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePathname } from 'next/navigation';
import { TrashLink } from './TrashLink';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));

describe('liên kết Thùng rác trong sidebar', () => {
  it('trỏ tới /notes/trash', () => {
    vi.mocked(usePathname).mockReturnValue('/notes/workspace-1');
    render(<TrashLink />);

    expect(screen.getByRole('link', { name: 'Thùng rác' })).toHaveAttribute('href', '/notes/trash');
  });

  it('đánh dấu active khi đang ở /notes/trash', () => {
    vi.mocked(usePathname).mockReturnValue('/notes/trash');
    render(<TrashLink />);

    expect(screen.getByRole('link', { name: 'Thùng rác' })).toHaveAttribute('aria-current', 'page');
  });

  it('không đánh dấu active ở route khác', () => {
    vi.mocked(usePathname).mockReturnValue('/notes/workspace-1/page-1');
    render(<TrashLink />);

    expect(screen.getByRole('link', { name: 'Thùng rác' })).not.toHaveAttribute('aria-current');
  });
});
