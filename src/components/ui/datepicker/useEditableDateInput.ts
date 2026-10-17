'use client';
import * as React from 'react';
import { format } from 'date-fns';

const INPUT_FORMAT = 'dd/MM/yyyy';

/** Đọc chuỗi dd/MM/yyyy thành Date hợp lệ (loại 31/02...). */
export function parseDateInput(raw: string): Date | undefined {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  const day = Number(d), month = Number(mo) - 1, year = Number(y);
  const date = new Date(year, month, day);
  const isValid = date.getDate() === day && date.getMonth() === month && date.getFullYear() === year;
  return isValid ? date : undefined;
}

/** Chèn tự động dấu "/" theo mẫu dd/mm/yyyy khi người dùng gõ số — không cần tự gõ "/" */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Trạng thái ô gõ tay ngày cho DatePicker `editable` (mode 'single'). */
export function useEditableDateInput(
  date: Date | undefined,
  commit: (next: Date | undefined) => void,
  isAllowed: (next: Date) => boolean,
) {
  // Khởi tạo từ `date` để lần mount đầu (hoặc remount khi quay lại bước trước)
  // ô nhập vẫn hiển thị đúng giá trị — nếu để rỗng, onBlur sẽ commit rỗng và xoá dữ liệu.
  const [inputValue, setInputValue] = React.useState(() => (date ? format(date, INPUT_FORMAT) : ''));
  // Đồng bộ ô nhập khi `date` đổi từ ngoài (chọn lịch / controlled) — chỉnh state ngay
  // trong render (pattern React chính thức) thay vì effect để tránh cascading render.
  const [syncedDate, setSyncedDate] = React.useState(date);
  if (date !== syncedDate) {
    setSyncedDate(date);
    setInputValue(date ? format(date, INPUT_FORMAT) : '');
  }

  const onInputChange = (raw: string) => {
    const masked = maskDateInput(raw);
    setInputValue(masked);
    const parsed = parseDateInput(masked);
    if (parsed && isAllowed(parsed)) commit(parsed);
  };

  const onInputBlur = () => {
    if (!inputValue.trim()) return commit(undefined);
    const parsed = parseDateInput(inputValue);
    if (!parsed || !isAllowed(parsed)) setInputValue(date ? format(date, INPUT_FORMAT) : '');
  };

  return { inputValue, onInputChange, onInputBlur };
}
