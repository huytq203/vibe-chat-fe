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
    const img = container.querySelector('img[src*="avatar-2.png"]');
    expect(img).toBeInTheDocument();
  });

  it('nests both the form panel and the illustration panel inside one shared card', () => {
    const { container } = render(
      <AuthShowcaseLayout>
        <div>form-content</div>
      </AuthShowcaseLayout>
    );

    // Mobile là surface phẳng; từ md mới trở lại thẻ nổi dùng chung cho hai cột.
    const card = container.querySelector('[data-auth-surface]');
    expect(card).toHaveClass('md:rounded-2xl', 'md:border', 'md:shadow-2xl');
    expect(card).not.toHaveClass('rounded-2xl', 'border', 'shadow-2xl');

    const formContent = screen.getByText('form-content');
    const illustration = container.querySelector('img[src*="avatar-2.png"]');

    expect(card?.contains(formContent)).toBe(true);
    expect(card?.contains(illustration)).toBe(true);
  });
});
