import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Sticker } from '@/features/chat/types/sticker';
import { MediaPickerTrigger } from './MediaPickerTrigger';

const sendSticker = vi.fn();
const toastError = vi.fn();

const sticker: Sticker = {
  id: 'sticker-1',
  packId: 'pack-1',
  url: '/cat.webp',
  emoji: '😺',
  width: 512,
  height: 512,
  isAnimated: false,
};

vi.mock('@/lib/hooks/useIsMobile', () => ({ useIsMobile: () => false }));
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
    onPickSticker,
    sendingStickerId,
  }: {
    onPickSticker: (value: Sticker) => void;
    sendingStickerId?: string | null;
  }) => (
    <button
      type="button"
      disabled={Boolean(sendingStickerId)}
      onClick={() => onPickSticker(sticker)}
    >
      Gửi sticker
    </button>
  ),
}));

interface MutationCallbacks {
  onError: () => void;
  onSettled: () => void;
}

describe('MediaPickerTrigger', () => {
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
});
