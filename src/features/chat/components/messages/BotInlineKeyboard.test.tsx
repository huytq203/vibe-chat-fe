import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BotInlineKeyboard } from './BotInlineKeyboard';
import type { Message } from '@/features/chat/types';

const mockMutate = vi.fn();

vi.mock('@/features/chat/hooks/use-callback-mutations', () => ({
  useCreateCallback: () => ({ mutate: mockMutate, isPending: false }),
}));

const buildMessage = (metadata: unknown): Message =>
  ({
    id: 'msg-1',
    conversationId: 'conv-1',
    isDeleted: false,
    metadata,
  }) as Message;

describe('BotInlineKeyboard', () => {
  it('nên render nút và gọi mutate với đúng callbackData khi click', () => {
    const message = buildMessage({
      bot: {
        replyMarkup: {
          inlineKeyboard: [
            { buttons: [{ text: 'Xác nhận', callbackData: 'confirm:1' }] },
          ],
        },
      },
    });

    render(<BotInlineKeyboard message={message} isMe={false} />);
    fireEvent.click(screen.getByText('Xác nhận'));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        conversationId: 'conv-1',
        messageId: 'msg-1',
        callbackData: 'confirm:1',
      },
      expect.anything(),
    );
  });

  it('nên không render gì khi message không có inlineKeyboard', () => {
    const message = buildMessage(null);

    const { container } = render(
      <BotInlineKeyboard message={message} isMe={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('nên không render gì khi isMe=true', () => {
    const message = buildMessage({
      bot: {
        replyMarkup: {
          inlineKeyboard: [{ buttons: [{ text: 'X', callbackData: 'x' }] }],
        },
      },
    });

    const { container } = render(
      <BotInlineKeyboard message={message} isMe={true} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
