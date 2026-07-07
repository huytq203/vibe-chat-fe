import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthShowcaseLayout } from './AuthShowcaseLayout';

describe('AuthShowcaseLayout', () => {
  it('renders children inside the form column', () => {
    render(
      <AuthShowcaseLayout>
        <div>form-content</div>
      </AuthShowcaseLayout>
    );
    expect(screen.getByText('form-content')).toBeInTheDocument();
  });

  it('renders the default title and tagline', () => {
    render(
      <AuthShowcaseLayout>
        <div />
      </AuthShowcaseLayout>
    );
    expect(screen.getByText('Halo')).toBeInTheDocument();
    expect(screen.getByText('Kết nối không giới hạn, trò chuyện mọi lúc.')).toBeInTheDocument();
  });

  it('overrides title and tagline via props', () => {
    render(
      <AuthShowcaseLayout title="Custom" tagline="Custom tagline">
        <div />
      </AuthShowcaseLayout>
    );
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Custom tagline')).toBeInTheDocument();
  });

  it('renders the character illustration image', () => {
    const { container } = render(
      <AuthShowcaseLayout>
        <div />
      </AuthShowcaseLayout>
    );
    const img = container.querySelector('img[src*="avatar-vespa.png"]');
    expect(img).toBeInTheDocument();
  });

  it('nests both the form panel and the illustration panel inside one shared card', () => {
    const { container } = render(
      <AuthShowcaseLayout>
        <div>form-content</div>
      </AuthShowcaseLayout>
    );

    // Thẻ bo góc dùng chung — đúng 1 phần tử, không phải 2 cột full-bleed tách rời.
    const cards = container.querySelectorAll('.rounded-2xl.border.shadow-2xl');
    expect(cards).toHaveLength(1);
    const card = cards[0];

    const formContent = screen.getByText('form-content');
    const illustration = container.querySelector('img[src*="avatar-vespa.png"]');

    expect(card.contains(formContent)).toBe(true);
    expect(card.contains(illustration)).toBe(true);
  });
});
