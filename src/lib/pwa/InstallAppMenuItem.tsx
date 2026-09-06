'use client';

import { Download, Share } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { isElectron } from '@/lib/electron';
import { useInstallCapability } from './useInstallCapability';

interface InstallAppMenuItemProps {
  /** Class của item trong menu chứa nó — component không tự quyết định style. */
  className?: string;
  /** Cho menu cha đóng lại sau khi user chọn cài. */
  onSelect?: () => void;
}

/**
 * Lối vào cài app luôn có sẵn trong menu, kể cả khi user đã đóng banner mời cài.
 * Không render gì khi app đã cài hoặc browser không hỗ trợ.
 */
export function InstallAppMenuItem({ className, onSelect }: InstallAppMenuItemProps): ReactNode {
  const { mode, install } = useInstallCapability(!isElectron());
  const [isHintOpen, setHintOpen] = useState(false);

  if (mode === null) return null;

  if (mode === 'ios') {
    return (
      <>
        <button
          type="button"
          className={className}
          aria-expanded={isHintOpen}
          onClick={() => setHintOpen((open) => !open)}
        >
          <Share className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Cài ứng dụng
        </button>
        {isHintOpen && (
          <p className="px-2.5 pb-2 text-xs text-muted-foreground">
            Chạm <strong>Chia sẻ</strong> rồi chọn <strong>Thêm vào MH chính</strong>.
          </p>
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void install();
        onSelect?.();
      }}
    >
      <Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      Cài ứng dụng
    </button>
  );
}
