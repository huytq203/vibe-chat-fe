import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaPickerPanel } from './MediaPickerPanel';

const getItem = vi.fn();
const setItem = vi.fn();

vi.mock('@/lib/storage/local-storage', () => ({
  getItem: (key: string) => getItem(key),
  setItem: (key: string, value: string) => setItem(key, value),
}));

vi.mock('@/components/common/EmojiPicker', () => ({
  EmojiPicker: ({ width, height }: { width?: string; height?: string }) => (
    <div data-testid="emoji-picker" data-width={width} data-height={height} />
  ),
  prefetchEmojiPicker: vi.fn(),
}));

vi.mock('../StickerPicker', () => ({
  StickerPicker: ({ sendingId }: { sendingId?: string | null }) => (
    <div data-testid="sticker-picker" data-sending-id={sendingId} />
  ),
}));

vi.mock('./GifPicker', () => ({
  GifPicker: () => <div data-testid="gif-picker" />,
}));

const baseProps = {
  onEmojiSelect: vi.fn(),
  onPickSticker: vi.fn(),
  onPickGif: vi.fn(),
};

describe('MediaPickerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getItem.mockReturnValue(null);
  });

  it('mặc định mở tab Emoji', () => {
    render(<MediaPickerPanel {...baseProps} />);

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    expect(screen.queryByTestId('gif-picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('emoji-picker')).toHaveAttribute('data-width', '100%');
    expect(screen.getByTestId('emoji-picker')).toHaveAttribute('data-height', '100%');
  });

  it('đổi sang tab GIF và ghi nhớ lựa chọn', async () => {
    render(<MediaPickerPanel {...baseProps} />);

    await userEvent.click(screen.getByRole('tab', { name: 'GIF' }));

    expect(await screen.findByTestId('gif-picker')).toBeInTheDocument();
    expect(setItem).toHaveBeenCalledWith('chat.media-picker.tab', 'gif');
  });

  it('khôi phục tab đã lưu khi mở lại', () => {
    getItem.mockReturnValue('sticker');
    render(<MediaPickerPanel {...baseProps} />);

    expect(screen.getByTestId('sticker-picker')).toBeInTheDocument();
  });

  it('chuyển trạng thái sticker đang gửi xuống StickerPicker', () => {
    getItem.mockReturnValue('sticker');
    render(<MediaPickerPanel {...baseProps} sendingStickerId="sticker-1" />);

    expect(screen.getByTestId('sticker-picker')).toHaveAttribute(
      'data-sending-id',
      'sticker-1',
    );
  });

  it('bỏ qua giá trị lưu trữ rác', () => {
    getItem.mockReturnValue('hacked');
    render(<MediaPickerPanel {...baseProps} />);

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
  });

  it('emojiOnly: ẩn thanh tab và chỉ hiện emoji', () => {
    render(<MediaPickerPanel {...baseProps} emojiOnly />);

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'GIF' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Sticker' })).not.toBeInTheDocument();
  });
});
