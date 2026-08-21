import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComposerActions } from './ComposerActions';

let isMobile = false;

vi.mock('@/lib/hooks/useIsMobile', () => ({
  useIsMobile: () => isMobile,
}));

vi.mock('./media-picker', () => ({
  MediaPickerTrigger: ({ emojiOnly }: { emojiOnly?: boolean }) => (
    <button
      type="button"
      aria-label="Emoji, GIF và sticker"
      data-emoji-only={String(Boolean(emojiOnly))}
    />
  ),
}));

const baseProps = {
  conversationId: 'conv-1',
  isEditing: false,
  expanded: false,
  selfDestructTtl: null,
  onFiles: vi.fn(),
  onSelfDestruct: vi.fn(),
  onScheduleClick: vi.fn(),
  onContactClick: vi.fn(),
  onEmojiSelect: vi.fn(),
  onToggleExpanded: vi.fn(),
};

describe('ComposerActions', () => {
  beforeEach(() => {
    isMobile = false;
    vi.clearAllMocks();
  });

  it('desktop: giữ shortcut ảnh/tệp và đúng một nút mở picker', () => {
    render(<ComposerActions {...baseProps} />);

    expect(screen.getByRole('button', { name: 'Gửi ảnh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi tệp' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Emoji, GIF và sticker' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Sticker' })).not.toBeInTheDocument();
  });

  it('mobile: nút picker vẫn hiện ngoài thanh, ảnh/tệp nằm trong menu', async () => {
    isMobile = true;
    render(<ComposerActions {...baseProps} />);

    expect(screen.getByRole('button', { name: 'Emoji, GIF và sticker' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi ảnh' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Thêm tuỳ chọn' }));

    expect(await screen.findByRole('button', { name: 'Gửi ảnh' })).toBeInTheDocument();
  });

  it('khi sửa tin: picker chuyển sang chế độ chỉ emoji', () => {
    render(<ComposerActions {...baseProps} isEditing />);

    expect(screen.getByRole('button', { name: 'Emoji, GIF và sticker' })).toHaveAttribute(
      'data-emoji-only',
      'true',
    );
  });

  it('giữ action Mở WebApp trong menu thêm', async () => {
    const onWebappClick = vi.fn();
    render(<ComposerActions {...baseProps} onWebappClick={onWebappClick} />);

    expect(screen.queryByRole('button', { name: 'Mở WebApp' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm tuỳ chọn' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mở WebApp' }));

    expect(onWebappClick).toHaveBeenCalledOnce();
  });

  it('chỉ hiện upload ảnh sticker trong hội thoại bot Stickers', () => {
    render(<ComposerActions {...baseProps} stickerBotConversation />);

    expect(screen.getByRole('button', { name: 'Gửi ảnh sticker' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi tệp' })).not.toBeInTheDocument();
  });
});
