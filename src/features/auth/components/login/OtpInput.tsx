'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils/cn';

const OTP_LENGTH = 6;
const CELL_INDEXES = Array.from({ length: OTP_LENGTH }, (_, index) => index);

interface OtpInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
}

const onlyDigits = (raw: string): string => raw.replace(/\D/g, '');

/** Mã 6 số, mỗi số một ô: tự nhảy ô khi nhập, lùi khi xoá, dán được cả chuỗi. */
export function OtpInput({ id, value, onChange, hasError = false, disabled = false }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusCell = (index: number): void => {
    refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus();
  };

  const setDigit = (index: number, digit: string): void => {
    const chars = value.padEnd(OTP_LENGTH, ' ').split('');
    chars[index] = digit || ' ';
    onChange(chars.join('').trimEnd());
  };

  const handleChange = (index: number, raw: string): void => {
    const digit = onlyDigits(raw).slice(-1);
    setDigit(index, digit);
    if (digit) focusCell(index + 1);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Backspace' && !value[index]) {
      focusCell(index - 1);
    } else if (event.key === 'ArrowLeft') {
      focusCell(index - 1);
    } else if (event.key === 'ArrowRight') {
      focusCell(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>): void => {
    const digits = onlyDigits(event.clipboardData.getData('text')).slice(0, OTP_LENGTH);
    if (!digits) return;
    event.preventDefault();
    onChange(digits);
    focusCell(digits.length);
  };

  return (
    <div role="group" aria-label="Mã đăng nhập" className="grid grid-cols-6 gap-2">
      {CELL_INDEXES.map((index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          id={index === 0 ? id : undefined}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`Chữ số ${index + 1}`}
          aria-invalid={hasError || undefined}
          value={value[index] ?? ''}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className={cn(
            'h-14 w-full min-w-0 rounded-xl border bg-muted text-center text-[22px] font-bold tabular-nums text-foreground caret-primary outline-none transition-colors',
            'focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/35',
            hasError ? 'border-danger' : 'border-input',
          )}
        />
      ))}
    </div>
  );
}
