import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { GoogleIcon, FacebookIcon, GithubIcon } from './BrandIcons';

describe('BrandIcons', () => {
  it('renders each brand icon as an svg element', () => {
    const { container: google } = render(<GoogleIcon />);
    const { container: facebook } = render(<FacebookIcon />);
    const { container: github } = render(<GithubIcon />);

    expect(google.querySelector('svg')).toBeInTheDocument();
    expect(facebook.querySelector('svg')).toBeInTheDocument();
    expect(github.querySelector('svg')).toBeInTheDocument();
  });

  it('forwards className to the svg element', () => {
    const { container } = render(<GoogleIcon className="h-4 w-4" />);
    expect(container.querySelector('svg')).toHaveClass('h-4', 'w-4');
  });
});
