export type Sticker = {
  id: string;
  packId: string;
  url: string;
  emoji: string;
  width: number;
  height: number;
  isAnimated: boolean;
};

export type StickerPack = {
  id: string;
  title: string;
  slug: string;
  ownerId: string;
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'REMOVED';
  stickerCount: number;
  isOfficial: boolean;
  coverUrl: string | null;
  rejectReason: string | null;
  stickers?: Sticker[];
};

export type MyStickers = { packs: StickerPack[]; recent: Sticker[]; favorites: Sticker[] };
