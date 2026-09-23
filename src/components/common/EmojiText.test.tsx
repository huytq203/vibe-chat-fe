import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EmojiText } from './EmojiText';

describe('EmojiText', () => {
  it('shows the original emoji after its image fails without retrying', () => {
    render(<EmojiText text="Hello ❤️!" />);

    const image = screen.getByRole('img', { name: '❤️' });
    fireEvent.error(image);

    expect(screen.queryByRole('img', { name: '❤️' })).not.toBeInTheDocument();
    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(screen.getByText('❤️').parentElement).toHaveTextContent('Hello ❤️!');
  });
});
