import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SuggestionOptions } from '@tiptap/suggestion';
import { RichMessageEditor } from './RichMessageEditor';

const mentionSuggestion = {
  items: () => [],
  command: () => undefined,
  render: () => ({}),
} as unknown as Omit<SuggestionOptions, 'editor'>;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});

describe('RichMessageEditor interaction', () => {
  it('nhận lại plaintext khi chuyển từ textarea sang editor mở rộng', async () => {
    render(
      <RichMessageEditor
        placeholder="Nhập tin nhắn..."
        initialValue={{
          plaintext: 'Nội dung đang gõ',
          mentions: [],
          richText: null,
        }}
        mentionSuggestion={mentionSuggestion}
        isMentionOpen={() => false}
        onUpdate={vi.fn()}
        onEnter={vi.fn()}
        onPasteFiles={() => false}
      />,
    );

    expect(await screen.findByRole('textbox', { name: 'Nhập tin nhắn' })).toHaveTextContent(
      'Nội dung đang gõ',
    );
  });

  it('focus editor ngay từ pointer gesture đầu tiên và phát trạng thái focus cho composer', async () => {
    const onFocusRequest = vi.fn();
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <RichMessageEditor
        placeholder="Nhập tin nhắn..."
        mentionSuggestion={mentionSuggestion}
        isMentionOpen={() => false}
        onUpdate={vi.fn()}
        onEnter={vi.fn()}
        onPasteFiles={() => false}
        onFocusRequest={onFocusRequest}
      />,
    );

    const textbox = await screen.findByRole('textbox', { name: 'Nhập tin nhắn' });
    vi.useFakeTimers();
    fireEvent.pointerDown(textbox);

    expect(textbox).toHaveFocus();
    expect(onFocusRequest).toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(280);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});
