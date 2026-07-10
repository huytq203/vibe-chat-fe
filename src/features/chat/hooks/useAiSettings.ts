'use client';

import { useState } from 'react';
import { getJSON, setJSON } from '@/lib/storage/local-storage';

const STORAGE_KEY = 'ai-chat-settings';

export type AiSettings = { model: string };

const DEFAULT: AiSettings = { model: 'gemini-2.0-flash-lite' };

function loadFromStorage(): AiSettings {
  return { ...DEFAULT, ...getJSON<Partial<AiSettings>>(STORAGE_KEY, {}) };
}

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(loadFromStorage);

  function saveSettings(next: AiSettings): void {
    setJSON(STORAGE_KEY, next);
    setSettings(next);
  }

  return { settings, saveSettings };
}
