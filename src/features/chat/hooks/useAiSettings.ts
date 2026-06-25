'use client';

import { useState } from 'react';

const STORAGE_KEY = 'ai-chat-settings';

export type AiSettings = { model: string };

const DEFAULT: AiSettings = { model: 'gemini-2.0-flash-lite' };

function loadFromStorage(): AiSettings {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<AiSettings>) };
  } catch {
    return DEFAULT;
  }
}

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(loadFromStorage);

  function saveSettings(next: AiSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setSettings(next);
  }

  return { settings, saveSettings };
}
