import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginPageShell } from './LoginPageShell';

describe('LoginPageShell', () => {
  it('renders children inside the form column', () => {
    render(
      <LoginPageShell>
        <div>form-content</div>
      </LoginPageShell>
    );
    expect(screen.getByText('form-content')).toBeInTheDocument();
  });

  it('renders the Halo workspace banner in the side panel', () => {
    const { container } = render(
      <LoginPageShell>
        <div />
      </LoginPageShell>
    );
    const img = container.querySelector('img[src*="banner2-nobg.png"]');
    expect(img).toBeInTheDocument();
    expect(img?.parentElement).toHaveClass('inset-4', 'z-20');
  });

  it('does not keep the previous logo watermark in the form background', () => {
    const { container } = render(
      <LoginPageShell>
        <div />
      </LoginPageShell>
    );
    expect(container.querySelector('img[src*="logo4.png"]')).not.toBeInTheDocument();
  });

  it('renders a flat full-bleed surface without a framed card', () => {
    const { container } = render(
      <LoginPageShell>
        <div>form-content</div>
      </LoginPageShell>
    );

    // Bố cục phẳng như register: bỏ khung card để form không bị cắt khi viewport thấp.
    const surface = container.querySelector('[data-auth-surface]');
    expect(surface).toBe(container.firstElementChild);
    expect(surface).toHaveClass('flex', 'h-full', 'overflow-hidden', 'bg-background');
    expect(surface).not.toHaveClass(
      'rounded-xl',
      'md:rounded-xl',
      'border',
      'md:border',
      'md:max-w-5xl'
    );
    expect(container.querySelector('.bg-sidebar')).toBeInTheDocument();
    expect(container.querySelector('.bg-gradient-to-r')).not.toBeInTheDocument();
  });

  it('scrolls only inside the form column so no content is clipped', () => {
    render(
      <LoginPageShell>
        <div>form-content</div>
      </LoginPageShell>
    );

    const inner = screen.getByText('form-content').parentElement;
    expect(inner).toHaveClass('my-auto', 'max-w-md');
    expect(inner?.parentElement).toHaveClass('flex-1', 'overflow-y-auto');
  });

  it('renders the brand watermark in the decorative layer, clipped to the form column', () => {
    const { container } = render(
      <LoginPageShell>
        <div />
      </LoginPageShell>
    );
    const mark = container.querySelector('.brand-watermark');
    expect(mark).toBeInTheDocument();
    // Lớp bọc phải cắt ở mép panel minh hoạ (panel đục sẽ che vết cắt) và không
    // bắt sự kiện chuột.
    const clip = mark?.parentElement;
    expect(clip).toHaveAttribute('aria-hidden', 'true');
    expect(clip).toHaveClass('pointer-events-none', 'overflow-hidden', 'lg:right-[42%]');
  });
});
