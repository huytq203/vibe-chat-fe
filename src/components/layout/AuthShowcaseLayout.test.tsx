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
});
