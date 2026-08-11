import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComposerActions } from './ComposerActions';

let isMobile = false;

vi.mock('@/lib/hooks/useIsMobile', () => ({
  useIsMobile: () => isMobile,
}));

vi.mock('@/features/chat/hooks/use-stickers', () => ({
  useSendSticker: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock('@/components/common/EmojiPicker', () => ({
  EmojiPicker: () => <div data-testid="emoji-picker" />,
  prefetchEmojiPicker: vi.fn(),
}));

vi.mock('./StickerPicker', () => ({
  StickerPicker: () => <div data-testid="sticker-picker" />,
}));

const baseProps = {
  conversationId: 'conv-1',
  isEditing: false,
  expanded: false,
  emojiOpen: false,
  selfDestructTtl: null,
  onFiles: vi.fn(),
  onSelfDestruct: vi.fn(),
  onScheduleClick: vi.fn(),
  onContactClick: vi.fn(),
  onEmojiOpenChange: vi.fn(),
  onEmojiButtonClick: vi.fn(),
  onEmojiSelect: vi.fn(),
  onToggleExpanded: vi.fn(),
};

describe('ComposerActions', () => {
  beforeEach(() => {
    isMobile = false;
    vi.clearAllMocks();
  });

  it('keeps quick actions visible on desktop', () => {
    render(<ComposerActions {...baseProps} />);

    expect(screen.getByRole('button', { name: 'Gửi ảnh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi tệp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emoji' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sticker' })).toBeInTheDocument();
  });

  it('shows only the more trigger until mobile users open it', async () => {
    isMobile = true;
    render(<ComposerActions {...baseProps} />);

    expect(screen.queryByRole('button', { name: 'Gửi ảnh' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Emoji' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sticker' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Thêm tuỳ chọn' }));

    expect(await screen.findByRole('button', { name: 'Gửi ảnh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi tệp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emoji' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sticker' })).toBeInTheDocument();
  });

  it('opens the emoji picker inside the mobile more menu', async () => {
    isMobile = true;
    render(<ComposerActions {...baseProps} />);

    await userEvent.click(screen.getByRole('button', { name: 'Thêm tuỳ chọn' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Emoji' }));

    expect(await screen.findByTestId('emoji-picker')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quay lại tuỳ chọn' })).toBeInTheDocument();
  });

  it('keeps the bot WebApp action inside the more menu', async () => {
    const onWebappClick = vi.fn();
    render(<ComposerActions {...baseProps} onWebappClick={onWebappClick} />);

    expect(screen.queryByRole('button', { name: 'Mở WebApp' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm tuỳ chọn' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mở WebApp' }));

    expect(onWebappClick).toHaveBeenCalledOnce();
  });

  it('only exposes the image sticker upload in the stickers bot conversation', () => {
    render(<ComposerActions {...baseProps} stickerBotConversation />);

    expect(screen.getByRole('button', { name: 'Gửi ảnh sticker' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi tệp' })).not.toBeInTheDocument();
  });
});
