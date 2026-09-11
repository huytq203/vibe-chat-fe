import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sticker } from '@/features/chat/types/sticker';
import { MediaPickerTrigger } from './MediaPickerTrigger';

const sendSticker = vi.fn();
const toastError = vi.fn();
let isMobile = false;

const sticker: Sticker = {
  id: 'sticker-1',
  packId: 'pack-1',
  url: '/cat.webp',
  emoji: '😺',
  width: 512,
  height: 512,
  isAnimated: false,
};

vi.mock('@/lib/hooks/useIsMobile', () => ({ useIsMobile: () => isMobile }));
vi.mock('@/components/common/EmojiPicker', () => ({ prefetchEmojiPicker: vi.fn() }));
vi.mock('@/features/chat/hooks/use-stickers', () => ({
  useSendSticker: () => ({ mutate: sendSticker }),
}));
vi.mock('@/features/chat/hooks/use-giphy', () => ({
  useSendGif: () => ({ mutate: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: { error: (message: string) => toastError(message) } }));
vi.mock('@/components/ui/popover/Popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('./MediaPickerPanel', () => ({
  MediaPickerPanel: ({
    onEmojiSelect,
    onPickSticker,
    sendingStickerId,
  }: {
    onEmojiSelect: (value: string) => void;
    onPickSticker: (value: Sticker) => void;
    sendingStickerId?: string | null;
  }) => (
    <>
      <button type="button" onClick={() => onEmojiSelect('😀')}>Chọn emoji</button>
      <button
        type="button"
        disabled={Boolean(sendingStickerId)}
        onClick={() => onPickSticker(sticker)}
      >
        Gửi sticker
      </button>
    </>
  ),
}));

interface MutationCallbacks {
  onError: () => void;
  onSettled: () => void;
}

describe('MediaPickerTrigger', () => {
  beforeEach(() => {
    isMobile = false;
    vi.clearAllMocks();
  });

  it('cho phép chọn liên tiếp nhiều emoji', async () => {
    const user = userEvent.setup();
    const onEmojiSelect = vi.fn();
    render(
      <MediaPickerTrigger
        conversationId="conv-1"
        onEmojiSelect={onEmojiSelect}
      />,
    );

    const emoji = screen.getByRole('button', { name: 'Chọn emoji' });
    await user.click(emoji);
    await user.click(emoji);

    expect(onEmojiSelect).toHaveBeenNthCalledWith(1, '😀');
    expect(onEmojiSelect).toHaveBeenNthCalledWith(2, '😀');
  });

  it('khóa sticker khi đang gửi, báo lỗi rồi mở khóa lại', async () => {
    const user = userEvent.setup();
    render(
      <MediaPickerTrigger
        conversationId="conv-1"
        onEmojiSelect={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: 'Gửi sticker' });
    await user.click(button);

    expect(sendSticker).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();

    const callbacks = sendSticker.mock.calls[0]?.[1] as MutationCallbacks;
    act(() => {
      callbacks.onError();
      callbacks.onSettled();
    });

    expect(toastError).toHaveBeenCalledWith('Gửi sticker thất bại. Bạn thử lại nhé.');
    expect(button).toBeEnabled();
  });

  it('mobile: mở panel nội tuyến ngay lần chạm đầu và không dùng modal', async () => {
    isMobile = true;
    const user = userEvent.setup();
    const onRequestEditorFocus = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);

    render(
      <MediaPickerTrigger
        conversationId="conv-1"
        onEmojiSelect={vi.fn()}
        mobilePanelHost={host}
        onRequestEditorFocus={onRequestEditorFocus}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Emoji, GIF và sticker' });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(host.querySelector('[data-mobile-media-picker]')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(host.querySelector('[data-mobile-media-picker]')).not.toBeInTheDocument();
    expect(onRequestEditorFocus).toHaveBeenCalledOnce();
    host.remove();
  });
});
