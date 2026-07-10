/** Loại mark inline của rich text (xem spec rich-text-editor). */
export type RichMarkType =
  | 'bold' | 'italic' | 'underline' | 'strike'
  | 'color' | 'highlight' | 'link' | 'font';

/** 1 đoạn định dạng inline; offset theo UTF-16 của plaintext (đồng bộ Mention). */
export type RichMark = {
  start: number;
  end: number; // exclusive
  type: RichMarkType;
  /** color/highlight = preset key; link = URL; font = preset key. */
  value?: string;
};

/** Căn lề theo block (đoạn). */
export type RichBlock = {
  start: number;
  end: number;
  align: 'left' | 'center' | 'right';
};

/** Định dạng rich text lưu trong metadata.richText. */
export type RichText = {
  v: 1;
  marks: RichMark[];
  blocks: RichBlock[];
};
