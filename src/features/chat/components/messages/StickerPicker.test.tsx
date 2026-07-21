import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StickerPicker } from './StickerPicker';

const useMyStickers = vi.fn();
vi.mock('@/features/chat/hooks/use-stickers', () => ({ useMyStickers: () => useMyStickers() }));

const sticker = { id: 'sticker-1', packId: 'pack-1', url: '/cat.webp', emoji: '😺', width: 512, height: 512, isAnimated: false };
const pack = { id: 'pack-1', title: 'Mèo vui', slug: 'meo-vui', ownerId: 'owner', status: 'PUBLISHED', stickerCount: 1, isOfficial: false, coverUrl: '/cover.webp', rejectReason: null, stickers: [sticker] };

describe('StickerPicker — P4', () => {
  beforeEach(() => useMyStickers.mockReturnValue({ isLoading: false, data: { packs: [pack], recent: [sticker], favorites: [] } }));

  it('hiển thị recent và gọi onPick với sticker được chọn', async () => {
    const onPick = vi.fn(); render(<StickerPicker onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: '😺' }));
    expect(onPick).toHaveBeenCalledWith(sticker);
  });

  it('chuyển tab pack và hiển thị sticker trong pack', async () => {
    render(<StickerPicker onPick={vi.fn()} />);
    await userEvent.click(screen.getByTitle('Mèo vui'));
    expect(screen.getByRole('button', { name: '😺' })).toBeInTheDocument();
  });

  it('hiển thị hướng dẫn @Stickers khi thư viện trống', () => {
    useMyStickers.mockReturnValue({ isLoading: false, data: { packs: [], recent: [], favorites: [] } });
    render(<StickerPicker onPick={vi.fn()} />);
    expect(screen.getByText(/Nhắn @Stickers/)).toBeInTheDocument();
  });
});
