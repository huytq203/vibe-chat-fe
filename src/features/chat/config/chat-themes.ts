import type { CSSProperties } from 'react';

export type BubbleConfig = {
  /** Inline style áp vào bubble tin mình gửi */
  myStyle: CSSProperties;
  /** Inline style áp vào bubble tin người khác gửi */
  otherStyle: CSSProperties;
  /** Màu chữ timestamp + trạng thái trong bubble mình */
  myMetaColor: string;
  /** Màu chữ timestamp trong bubble người khác */
  otherMetaColor: string;
};

export type ChatTheme = {
  key: string;
  label: string;
  subtitle?: string;
  /** CSS background cho thumbnail tròn trong danh sách */
  thumbnail: string;
  /** CSS background cho ChatPanel (null = không đổi nền) */
  wallpaper: string | null;
  bubbleConfig: BubbleConfig;
};

/** Dùng khi không có theme nào được chọn (Tailwind classes mặc định vẫn dùng) */
export const DEFAULT_BUBBLE_CONFIG: BubbleConfig = {
  myStyle: {},
  otherStyle: {},
  myMetaColor: '',
  otherMetaColor: '',
};

export const CHAT_THEMES: ChatTheme[] = [
  {
    key: 'default',
    label: 'Mặc định',
    thumbnail: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    wallpaper: null,
    bubbleConfig: DEFAULT_BUBBLE_CONFIG,
  },
  {
    key: 'ocean',
    label: 'Đại dương',
    thumbnail: "url('/asset/images-theme/daiduong.jpg') center / cover",
    wallpaper: "url('/asset/images-theme/daiduong.jpg')",
    bubbleConfig: {
      myStyle: { background: 'linear-gradient(135deg, #1976d2, #0288d1)', color: '#fff' },
      otherStyle: { backgroundColor: 'rgba(10,30,60,0.65)', color: '#e3f2fd', borderColor: 'rgba(100,181,246,0.2)' },
      myMetaColor: 'rgba(255,255,255,0.65)',
      otherMetaColor: 'rgba(200,230,255,0.6)',
    },
  },
  {
    key: 'forest',
    label: 'Rừng xanh',
    thumbnail: "url('/asset/images-theme/rungxanh.jpg') center / cover",
    wallpaper: "url('/asset/images-theme/rungxanh.jpg')",
    bubbleConfig: {
      myStyle: { background: 'linear-gradient(135deg, #2e7d32, #1b5e20)', color: '#fff' },
      otherStyle: { backgroundColor: 'rgba(10,30,10,0.65)', color: '#e8f5e9', borderColor: 'rgba(129,199,132,0.2)'},
      myMetaColor: 'rgba(255,255,255,0.65)',
      otherMetaColor: 'rgba(200,230,200,0.6)',
    },
  },
  {
    key: 'sunset',
    label: 'Hoàng hôn',
    thumbnail: "url('/asset/images-theme/hoanghon.webp') center / cover",
    wallpaper: "url('/asset/images-theme/hoanghon.webp')",
    bubbleConfig: {
      myStyle: { background: 'linear-gradient(135deg, #e64a19, #f57f17)', color: '#fff' },
      otherStyle: { backgroundColor: 'rgba(60,15,5,0.65)', color: '#fbe9e7', borderColor: 'rgba(255,138,101,0.2)'},
      myMetaColor: 'rgba(255,255,255,0.65)',
      otherMetaColor: 'rgba(255,204,180,0.6)',
    },
  },
  {
    key: 'purple-dream',
    label: 'Tím mộng',
    thumbnail: '#3d1278',
    wallpaper: '#1a0030',
    bubbleConfig: {
      myStyle: { backgroundColor: '#7b1fa2', color: '#fff' },
      otherStyle: { backgroundColor: 'rgba(49,27,146,0.55)', color: '#f3e5f5', borderColor: 'rgba(206,147,216,0.25)' },
      myMetaColor: 'rgba(255,255,255,0.65)',
      otherMetaColor: 'rgba(230,200,255,0.6)',
    },
  },
  {
    key: 'rose',
    label: 'Hồng nhẹ',
    thumbnail: '#a01050',
    wallpaper: '#2d0015',
    bubbleConfig: {
      myStyle: { backgroundColor: '#c2185b', color: '#fff' },
      otherStyle: { backgroundColor: 'rgba(136,14,79,0.55)', color: '#fce4ec', borderColor: 'rgba(248,187,208,0.25)'},
      myMetaColor: 'rgba(255,255,255,0.65)',
      otherMetaColor: 'rgba(255,200,220,0.6)',
    },
  },
  {
    key: 'dawn',
    label: 'Bình minh',
    thumbnail: "url('/asset/images-theme/binhminh.png') center / cover",
    wallpaper: "url('/asset/images-theme/binhminh.png')",
    bubbleConfig: {
      myStyle: { background: 'linear-gradient(135deg, #f5576c, #fda085)', color: '#fff' },
      otherStyle: { backgroundColor: 'rgba(60,10,40,0.65)', color: '#fde8f5', borderColor: 'rgba(245,87,108,0.2)'},
      myMetaColor: 'rgba(255,255,255,0.65)',
      otherMetaColor: 'rgba(255,210,220,0.6)',
    },
  },
  {
    key: 'emerald',
    label: 'Ngọc lục',
    thumbnail: '#005a4e',
    wallpaper: '#001a17',
    bubbleConfig: {
      myStyle: { backgroundColor: '#00796b', color: '#fff' },
      otherStyle: { backgroundColor: 'rgba(0,77,64,0.55)', color: '#e0f2f1', borderColor: 'rgba(128,203,196,0.25)' },
      myMetaColor: 'rgba(255,255,255,0.65)',
      otherMetaColor: 'rgba(180,230,225,0.6)',
    },
  },
  {
    key: 'gold',
    label: 'Vàng kim',
    thumbnail: '#7a4800',
    wallpaper: '#1a0f00',
    bubbleConfig: {
      myStyle: { backgroundColor: '#f9a825', color: '#1a0f00' },
      otherStyle: { backgroundColor: 'rgba(62,39,0,0.6)', color: '#fff9c4', borderColor: 'rgba(255,193,7,0.25)' },
      myMetaColor: 'rgba(26,15,0,0.6)',
      otherMetaColor: 'rgba(255,240,180,0.6)',
    },
  },
  {
    key: 'midnight',
    label: 'Đêm tối',
    thumbnail: '#0d1b2a',
    wallpaper: '#050714',
    bubbleConfig: {
      myStyle: { backgroundColor: '#1e40af', color: '#fff' },
      otherStyle: { backgroundColor: 'rgba(15,23,42,0.75)', color: '#cbd5e1', borderColor: 'rgba(51,65,85,0.6)' },
      myMetaColor: 'rgba(255,255,255,0.6)',
      otherMetaColor: 'rgba(148,163,184,0.7)',
    },
  },
];

export function getTheme(key: string | null): ChatTheme {
  if (!key) return CHAT_THEMES[0];
  return CHAT_THEMES.find((t) => t.key === key) ?? CHAT_THEMES[0];
}
