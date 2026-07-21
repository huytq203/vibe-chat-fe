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

  it('renders the vespa illustration image in the side panel', () => {
    const { container } = render(
      <LoginPageShell>
        <div />
      </LoginPageShell>
    );
    const img = container.querySelector('img[src*="login-vespa-card.png"]');
    expect(img).toBeInTheDocument();
    expect(img?.parentElement).toHaveClass('-translate-x-44', '-translate-y-10', 'z-20');
  });

  it('renders the faint watermark image in the background', () => {
    const { container } = render(
      <LoginPageShell>
        <div />
      </LoginPageShell>
    );
    const img = container.querySelector('img[src*="login-vespa-watermark.png"]');
    expect(img).toBeInTheDocument();
  });

  it('uses the same themed background and card palette as register', () => {
    const { container } = render(
      <LoginPageShell>
        <div />
      </LoginPageShell>
    );

    expect(container.firstElementChild).toHaveClass('bg-background');
    expect(container.querySelector('.rounded-2xl.border-border.bg-background')).toBeInTheDocument();
    expect(container.querySelector('.bg-sidebar')).toBeInTheDocument();
    expect(container.querySelector('.bg-gradient-to-r')).not.toBeInTheDocument();
  });
});
