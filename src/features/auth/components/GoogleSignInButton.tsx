'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { env } from '@/config/env';
import { renderGoogleButton } from '@/lib/google/identity';

const BUTTON_WIDTH = 320;
const BUTTON_HEIGHT = 44;
const RENDER_CHECK_MS = 1500;
const MAX_RENDER_ATTEMPTS = 3;

const subscribeNoop = (): (() => void) => () => {};
const getClientSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

type GoogleSignInButtonProps = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

/** Nút "Tiếp tục với Google" chính thức của Google (bắt buộc theo điều khoản thương hiệu). */
export function GoogleSignInButton({ onCredential, disabled = false }: GoogleSignInButtonProps) {
  const clientId = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  // Chỉ vẽ ở client: server và client có thể thấy env khác nhau (build/restart lệch) → tránh hydration mismatch.
  const isClient = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

  // Nút GIS chỉ render 1 lần — giữ callback mới nhất qua ref để không render lại nút.
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const el = containerRef.current;
    if (!isClient || !clientId || !el) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Script GIS đôi khi chạy xong mà không vẽ iframe (mạng chậm, tab nền) → kiểm tra rồi vẽ lại.
    const attempt = (n: number): void => {
      renderGoogleButton(el, {
        clientId,
        width: BUTTON_WIDTH,
        onCredential: (token) => callbackRef.current(token),
      })
        .then(() => {
          if (cancelled) return;
          timer = setTimeout(() => {
            if (cancelled || el.childElementCount > 0) return;
            if (n < MAX_RENDER_ATTEMPTS) attempt(n + 1);
            else setFailed(true);
          }, RENDER_CHECK_MS);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    };
    attempt(1);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clientId, isClient]);

  if (!isClient || !clientId) return null;
  if (failed) {
    return <p className="text-center text-sm text-muted-foreground">Không tải được đăng nhập Google, hãy dùng mã email.</p>;
  }
  return (
    <div
      ref={containerRef}
      aria-disabled={disabled}
      style={{ minHeight: BUTTON_HEIGHT }}
      className={disabled ? 'pointer-events-none flex justify-center opacity-60' : 'flex justify-center'}
    />
  );
}
