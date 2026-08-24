import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CollabPerson } from '@/features/notes/hooks/useAwareness';
import { cursorColorFor } from '@/features/notes/lib/cursor-colors';

import { PresenceBar } from './PresenceBar';

function buildPeople(count: number): CollabPerson[] {
  return Array.from({ length: count }, (_, index) => ({
    userId: `user-${index}`,
    name: `Người ${index + 1}`,
    color: cursorColorFor(`user-${index}`),
    isSelf: index === 0,
  }));
}

describe('thanh người đang xem', () => {
  it('luôn cung cấp tên người dùng cho công nghệ hỗ trợ', () => {
    render(<PresenceBar people={buildPeople(2)} />);

    expect(screen.getByLabelText('Người 1 (Bạn)')).toBeInTheDocument();
    expect(screen.getByLabelText('Người 2')).toBeInTheDocument();
  });

  it('quá năm người thì hiện đúng số người còn lại', () => {
    render(<PresenceBar people={buildPeople(8)} />);

    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getAllByTitle(/Người/)).toHaveLength(5);
  });
});
