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

  it('renders the brand mark image instead of a generic icon', () => {
    const { container } = render(
      <AuthShowcaseLayout>
        <div />
      </AuthShowcaseLayout>
    );
    expect(container.querySelector('img[src*="logo4-192.png"]')).toBeInTheDocument();
    expect(container.querySelector('svg.lucide-message-circle')).toBeNull();
  });

  it('renders a flat full-bleed surface without a framed card', () => {
    const { container } = render(
      <AuthShowcaseLayout>
        <div>form-content</div>
      </AuthShowcaseLayout>
    );

    // Bố cục phẳng: không bo góc/viền/max-width — khung card cũ ép hai cột cao
    // bằng nhau nên form nhiều bước bị cắt khi viewport thấp.
    const surface = container.querySelector('[data-auth-surface]');
    expect(surface).toHaveClass('flex', 'h-full', 'overflow-hidden');
    expect(surface).not.toHaveClass(
      'rounded-xl',
      'md:rounded-xl',
      'border',
      'md:border',
      'md:max-w-5xl'
    );
  });

  it('scrolls only inside the form column so no content is clipped', () => {
    render(
      <AuthShowcaseLayout>
        <div>form-content</div>
      </AuthShowcaseLayout>
    );

    const formColumn = screen.getByText('form-content').parentElement?.parentElement;
    expect(formColumn).toHaveClass('flex-1', 'overflow-y-auto');
    // `my-auto` căn giữa khi dư chiều cao, tự về 0 khi nội dung cao hơn viewport.
    expect(screen.getByText('form-content').parentElement).toHaveClass('my-auto', 'max-w-md');
  });

  it('balances the form and illustration columns on fullscreen layouts', () => {
    const { container } = render(
      <AuthShowcaseLayout>
        <div />
      </AuthShowcaseLayout>
    );

    const illustrationPanel = container.querySelector('.bg-sidebar');
    expect(illustrationPanel).toHaveClass('lg:w-1/2', 'lg:flex-none');
  });

  it('renders the brand watermark in the decorative layer, clipped to the form column', () => {
    const { container } = render(
      <AuthShowcaseLayout>
        <div />
      </AuthShowcaseLayout>
    );
    const mark = container.querySelector('.brand-watermark');
    expect(mark).toBeInTheDocument();
    // Lớp bọc phải cắt ở mép panel minh hoạ (panel đục sẽ che vết cắt) và không
    // bắt sự kiện chuột.
    const clip = mark?.parentElement;
    expect(clip).toHaveAttribute('aria-hidden', 'true');
    expect(clip).toHaveClass('pointer-events-none', 'overflow-hidden', 'lg:right-1/2');
  });
});
