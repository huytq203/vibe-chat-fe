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
});
