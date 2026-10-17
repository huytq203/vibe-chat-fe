import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginPageShell } from './LoginPageShell';

const renderShell = () =>
  render(
    <LoginPageShell>
      <div>form-content</div>
    </LoginPageShell>
  );

describe('LoginPageShell', () => {
  it('renders children and the Halo brand in the form column', () => {
    renderShell();

    expect(screen.getByText('form-content')).toBeInTheDocument();
    expect(screen.getByText('Halo')).toBeInTheDocument();
  });

  it('renders a flat surface that is the single scroll container', () => {
    const { container } = renderShell();

    const surface = container.querySelector('[data-auth-surface]');
    expect(surface).toBe(container.firstElementChild);
    // Cả trang là vùng cuộn duy nhất để form không bị cắt khi viewport thấp.
    expect(surface).toHaveClass('h-full', 'overflow-y-auto', 'bg-background');
    expect(surface).not.toHaveClass('border', 'rounded-xl');
  });

  it('centers the content and keeps it clear of the art panel', () => {
    renderShell();

    const content = screen.getByText('form-content').parentElement;
    expect(content).toHaveClass('my-auto', 'items-center', 'text-center');
  });

  it('renders the mascot art panel as a decorative rounded card', () => {
    const { container } = renderShell();

    const img = container.querySelector('img[src*="banner-login.webp"]');
    expect(img).toBeInTheDocument();
    const panel = img?.closest('aside');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).toHaveClass('hidden', 'rounded-[28px]', 'lg:block');
    expect(screen.getByText(/Một nơi, một lần đăng nhập/)).toBeInTheDocument();
  });

  it('does not keep the old logo watermark or the half-screen sidebar panel', () => {
    const { container } = renderShell();

    expect(container.querySelector('.brand-watermark')).not.toBeInTheDocument();
    expect(container.querySelector('.bg-sidebar')).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="logo4.png"]')).not.toBeInTheDocument();
  });
});
