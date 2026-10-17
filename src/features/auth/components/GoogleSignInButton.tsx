'use client';

import { useEffect, useRef, useState } from 'react';
import { env } from '@/config/env';
import { renderGoogleButton } from '@/lib/google/identity';

const BUTTON_WIDTH = 320;

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

  // Nút GIS chỉ render 1 lần — giữ callback mới nhất qua ref để không render lại nút.
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const el = containerRef.current;
    if (!clientId || !el) return;
    renderGoogleButton(el, {
      clientId,
      width: BUTTON_WIDTH,
      onCredential: (token) => callbackRef.current(token),
    }).catch(() => setFailed(true));
  }, [clientId]);

  if (!clientId) return null;
  if (failed) {
    return <p className="text-center text-sm text-muted-foreground">Không tải được đăng nhập Google, hãy dùng mã email.</p>;
  }
  return (
    <div
      ref={containerRef}
      aria-disabled={disabled}
      className={disabled ? 'pointer-events-none flex justify-center opacity-60' : 'flex justify-center'}
    />
  );
}
