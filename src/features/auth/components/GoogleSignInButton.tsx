'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { env } from '@/config/env';
import { renderGoogleButton } from '@/lib/google/identity';
import { cn } from '@/lib/utils/cn';
import { GoogleLogo } from './GoogleLogo';

const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400; // giới hạn của Google Identity Services
const RENDER_CHECK_MS = 1500;
const MAX_RENDER_ATTEMPTS = 3;

const subscribeNoop = (): (() => void) => () => {};
const getClientSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

type GoogleSignInButtonProps = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

/** Nút "Tiếp tục với Google": giao diện của mình (bo góc đồng nhất), nút chính thức của Google đè trong suốt để nhận cú bấm. */
export function GoogleSignInButton({ onCredential, disabled = false }: GoogleSignInButtonProps) {
  const clientId = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
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

    // Chỉ hiện nút của mình khi iframe Google đã vẽ xong (nằm trong suốt phía trên nhận cú bấm).
    const observer = new MutationObserver(() => {
      if (el.childElementCount > 0) setReady(true);
    });
    observer.observe(el, { childList: true });

    // Script GIS đôi khi chạy xong mà không vẽ iframe (mạng chậm, tab nền) → kiểm tra rồi vẽ lại.
    const attempt = (n: number): void => {
      renderGoogleButton(el, {
        clientId,
        width: Math.round(Math.min(MAX_BUTTON_WIDTH, Math.max(MIN_BUTTON_WIDTH, el.clientWidth))),
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
      observer.disconnect();
    };
  }, [clientId, isClient]);

  if (!isClient || !clientId) return null;
  if (failed) {
    return <p className="text-center text-sm text-muted-foreground">Không tải được đăng nhập Google, hãy dùng mã email.</p>;
  }
  return (
    <div aria-disabled={disabled} className={cn('group relative h-12 w-full', disabled && 'pointer-events-none opacity-60')}>
      {ready ? (
        <div
          aria-hidden="true"
          className="pointer-events-none flex h-full items-center justify-center gap-3 rounded-xl border border-border bg-background text-[15px] font-semibold text-foreground transition-colors group-hover:bg-muted"
        >
          <GoogleLogo className="size-5" />
          Tiếp tục với Google
        </div>
      ) : (
        <div aria-hidden="true" className="h-full animate-pulse rounded-xl bg-muted" />
      )}
      {/* Nút chính thức của Google nằm trong suốt đè lên nút của mình (kéo giãn cho phủ đủ 48px):
          Google không cho chỉnh độ bo góc, còn cú bấm vẫn đi qua luồng đăng nhập chính thức. */}
      <div ref={containerRef} className="absolute inset-0 flex origin-top scale-y-[1.2] justify-center overflow-hidden opacity-0" />
    </div>
  );
}
