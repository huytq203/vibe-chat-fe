import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMessageDraftCommandStore } from '@/features/chat/stores/message-draft-command.store';
import { BotCommandText, hasBotCommand } from './BotCommandText';

describe('BotCommandText', () => {
  beforeEach(() => {
    useMessageDraftCommandStore.setState({ byConv: {}, nextId: 0 });
  });

  it('detects slash commands in bot help text', () => {
    expect(hasBotCommand('/analytics_overview')).toBe(true);
    expect(hasBotCommand('Xem nhanh: /analytics_overview')).toBe(true);
    expect(hasBotCommand('Tin nhắn thường https://example.com/a/b')).toBe(false);
  });

  it('writes clicked command into the conversation draft store', () => {
    render(
      <BotCommandText
        conversationId="conv-1"
        text={'Chọn /analytics_overview hoặc /analytics_messages'}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /analytics_overview/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /analytics_overview/i }));

    expect(useMessageDraftCommandStore.getState().byConv['conv-1']).toEqual({
      id: 1,
      text: '/analytics_overview',
    });
  });

  it('supports keyboard activation like a link', () => {
    render(
      <BotCommandText
        conversationId="conv-1"
        text={'Chọn /analytics_messages'}
      />,
    );

    fireEvent.keyDown(screen.getByRole('link', { name: /analytics_messages/i }), {
      key: 'Enter',
    });

    expect(useMessageDraftCommandStore.getState().byConv['conv-1']).toEqual({
      id: 1,
      text: '/analytics_messages',
    });
  });
});
