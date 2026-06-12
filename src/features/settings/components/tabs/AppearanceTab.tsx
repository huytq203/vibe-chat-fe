'use client';

import { Check } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { cn } from '@/lib/utils/cn';
import { SettingsSection } from '@/features/settings/components/SettingsSection';

export function AppearanceTab() {
  const { currentTheme, setTheme, themes } = useTheme();

  return (
    <SettingsSection title="Giao diện" desc="Chọn bảng màu hiển thị cho HaloChat.">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {themes.map((theme) => {
          const active = theme.name === currentTheme.name;
          const swatches = [theme.colors.primary, theme.colors.background, theme.colors.secondary];
          return (
            <button
              key={theme.name}
              type="button"
              onClick={() => setTheme(theme.name)}
              aria-pressed={active}
              className={cn(
                'relative flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-colors',
                active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted',
              )}
            >
              <span className="flex gap-1">
                {swatches.map((color, i) => (
                  <span
                    key={i}
                    className="h-5 w-5 rounded-full border border-border/50"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="truncate text-[12px] font-medium text-foreground">{theme.label}</span>
              {active && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
