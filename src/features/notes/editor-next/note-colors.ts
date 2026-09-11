export const NOTE_COLORS = [
  { key: "gray", label: "Xám" },
  { key: "orange", label: "Cam" },
  { key: "yellow", label: "Vàng" },
  { key: "green", label: "Lục" },
  { key: "blue", label: "Lam" },
  { key: "purple", label: "Tím" },
  { key: "pink", label: "Hồng" },
  { key: "red", label: "Đỏ" },
] as const;

export type NoteColorName = (typeof NOTE_COLORS)[number]["key"];

export function noteTextColor(color: NoteColorName): string {
  return `var(--note-text-${color})`;
}
