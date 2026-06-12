/** YYYY-MM-DD → DD/MM/YYYY */
export function formatDob(value: string | null | undefined): string | null {
  if (!value) return null;
  const [y, m, d] = value.split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}
