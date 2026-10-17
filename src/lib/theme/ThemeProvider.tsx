'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { themes, applyTheme, createTheme, getDefaultTheme, type Theme, type ThemeColors, type BuiltInThemeName } from './themes';
import { writeThemeCookie } from './theme-cookie';

const STORAGE_KEY = 'ui-theme';

/**
 * Union type for autocomplete suggestions while allowing any string.
 */
export type ThemeName = BuiltInThemeName | (string & {});

interface ThemeContextValue {
  currentTheme: Theme;
  setTheme: (name: ThemeName) => void;
  /** Register and switch to a custom theme */
  setCustomTheme: (name: string, label: string, colors: Partial<ThemeColors>) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: getDefaultTheme(),
  setTheme: () => {},
  setCustomTheme: () => {},
  themes,
});

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeName;
  /** Theme server đọc từ cookie: server và client dùng cùng giá trị ở lần vẽ đầu → không lệch hydration. */
  initialThemeName?: ThemeName;
}

const getStoredTheme = (allThemes: Theme[], defaultThemeName?: ThemeName, initialThemeName?: ThemeName): Theme => {
  const fallback = getDefaultTheme(allThemes);
  if (initialThemeName && !defaultThemeName) return allThemes.find(t => t.name === initialThemeName) ?? fallback;
  if (typeof window === 'undefined') return fallback;
  // defaultTheme prop in code takes priority over localStorage
  if (defaultThemeName) {
    return allThemes.find(t => t.name === defaultThemeName) ?? fallback;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return allThemes.find(t => t.name === saved) ?? fallback;
  } catch {
    return fallback;
  }
};

export function ThemeProvider({ children, defaultTheme, initialThemeName }: ThemeProviderProps) {
  const [allThemes, setAllThemes] = useState<Theme[]>(themes);
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => getStoredTheme(themes, defaultTheme, initialThemeName));

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Người dùng cũ chỉ có localStorage: ghi cookie một lần để các lần tải sau server vẽ đúng theme ngay.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved !== initialThemeName) writeThemeCookie(saved);
    } catch { /* localStorage bị chặn */ }
  }, [initialThemeName]);

  const setTheme = (name: ThemeName) => {
    const found = allThemes.find(t => t.name === name);
    if (!found) return;
    try { localStorage.setItem(STORAGE_KEY, name); } catch { /* SSR / quota */ }
    writeThemeCookie(name);
    setCurrentTheme(found);
  };

  const setCustomTheme = (name: string, label: string, colors: Partial<ThemeColors>) => {
    const custom = createTheme(name, label, colors);
    setAllThemes(prev => {
      const exists = prev.findIndex(t => t.name === name);
      return exists >= 0
        ? prev.map(t => t.name === name ? custom : t)
        : [...prev, custom];
    });
    try { localStorage.setItem(STORAGE_KEY, name); } catch { /* SSR / quota */ }
    writeThemeCookie(name);
    setCurrentTheme(custom);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, setCustomTheme, themes: allThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
