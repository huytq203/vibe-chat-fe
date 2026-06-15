import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RichText as RichTextData } from '@/features/chat/types';

// Dialog mở profile không liên quan logic render text → mock để tránh app-router/provider.
vi.mock('@/features/chat/components/contact/UserProfileDialog', () => ({
  UserProfileDialog: () => null,
}));

const { RichText } = await import('./RichText');

const rt = (marks: RichTextData['marks'], blocks: RichTextData['blocks'] = []): RichTextData => ({
  v: 1, marks, blocks,
});

describe('RichText', () => {
  it('render đậm theo range', () => {
    render(<RichText text="Xin chao" mentions={[]} richText={rt([{ start: 0, end: 3, type: 'bold' }])} />);
    expect(screen.getByText('Xin').closest('strong')).not.toBeNull();
  });

  it('render link an toàn, chặn javascript:', () => {
    render(
      <RichText
        text="click me"
        mentions={[]}
        richText={rt([{ start: 0, end: 8, type: 'link', value: 'javascript:alert(1)' }])}
      />,
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('click me')).toBeInTheDocument();
  });

  it('link hợp lệ render <a> target _blank', () => {
    render(
      <RichText
        text="open"
        mentions={[]}
        richText={rt([{ start: 0, end: 4, type: 'link', value: 'https://a.com' }])}
      />,
    );
    const a = screen.getByRole('link', { name: 'open' });
    expect(a).toHaveAttribute('href', 'https://a.com');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('fallback: richText rỗng → vẫn render text', () => {
    render(<RichText text="hello" mentions={[]} richText={rt([])} />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('mention thường → button bấm được; @all → không phải button', () => {
    render(
      <RichText
        text="@huy hello"
        mentions={[{ userId: 'u1', startOffset: 0, length: 4 }]}
        richText={rt([])}
      />,
    );
    expect(screen.getByRole('button', { name: '@huy' })).toBeInTheDocument();

    render(
      <RichText
        text="@all hi"
        mentions={[{ userId: 'x', startOffset: 0, length: 4 }]}
        richText={rt([])}
      />,
    );
    expect(screen.queryByRole('button', { name: '@all' })).toBeNull();
    expect(screen.getByText('@all')).toBeInTheDocument();
  });

  it('mention atomic: mark boundary trong mention không cắt chip', () => {
    render(
      <RichText
        text="@huy ok"
        mentions={[{ userId: 'u1', startOffset: 0, length: 4 }]}
        richText={rt([{ start: 0, end: 2, type: 'bold' }])}
      />,
    );
    expect(screen.getByRole('button', { name: '@huy' })).toBeInTheDocument();
  });

  it('marks chồng nhau → stack strong + em', () => {
    render(
      <RichText
        text="abc"
        mentions={[]}
        richText={rt([
          { start: 0, end: 3, type: 'bold' },
          { start: 1, end: 2, type: 'italic' },
        ])}
      />,
    );
    const b = screen.getByText('b');
    expect(b.closest('strong')).not.toBeNull();
    expect(b.closest('em')).not.toBeNull();
  });

  it('block align center → wrap với text-align center', () => {
    const { container } = render(
      <RichText
        text="hi"
        mentions={[]}
        richText={rt([], [{ start: 0, end: 2, align: 'center' }])}
      />,
    );
    expect(container.querySelector('[style*="text-align: center"]')).not.toBeNull();
  });
});
