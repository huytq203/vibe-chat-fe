'use client';

import { useCallback, useState } from 'react';
import { getItem, setItem } from '@/lib/storage/local-storage';

export const PICKER_TABS = ['emoji', 'gif', 'sticker'] as const;
export type PickerTab = (typeof PICKER_TABS)[number];

const STORAGE_KEY = 'chat.media-picker.tab';

export function isPickerTab(value: unknown): value is PickerTab {
  return PICKER_TABS.some((tab) => tab === value);
}

export function usePickerTab(): [PickerTab, (tab: PickerTab) => void] {
  const [tab, setTab] = useState<PickerTab>(() => {
    const saved = getItem(STORAGE_KEY);
    return isPickerTab(saved) ? saved : 'emoji';
  });

  const select = useCallback((next: PickerTab) => {
    setTab(next);
    setItem(STORAGE_KEY, next);
  }, []);

  return [tab, select];
}
