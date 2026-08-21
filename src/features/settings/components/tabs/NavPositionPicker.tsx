'use client';

import { Check } from 'lucide-react';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import {
  NavPosition,
  useSettingsStore,
  type NavPosition as NavPositionValue,
} from '@/features/settings/stores/settings.store';
import { cn } from '@/lib/utils/cn';

const POSITION_OPTIONS: Array<{ value: NavPositionValue; label: string }> = [
  { value: NavPosition.LEFT, label: 'Bên trái' },
  { value: NavPosition.RIGHT, label: 'Bên phải' },
  { value: NavPosition.BOTTOM, label: 'Phía dưới' },
];

function PositionPreview({ position }: { position: NavPositionValue }) {
  return (
    <span
      aria-hidden="true"
      className="relative block h-16 overflow-hidden rounded-md border border-border/70 bg-background"
    >
      <span className="absolute inset-2 rounded-sm bg-muted/60" />
      <span
        className={cn(
          'absolute rounded-full bg-primary',
          position === NavPosition.LEFT && 'bottom-2 left-2 top-2 w-1.5',
          position === NavPosition.RIGHT && 'bottom-2 right-2 top-2 w-1.5',
          position === NavPosition.BOTTOM && 'bottom-2 left-2 right-2 h-1.5',
        )}
      />
    </span>
  );
}

export function NavPositionPicker() {
  const navPosition = useSettingsStore((state) => state.navPosition);
  const setNavPosition = useSettingsStore((state) => state.setNavPosition);

  return (
    <SettingsSection
      title="Vị trí thanh điều hướng"
      desc="Chọn nơi hiển thị thanh điều hướng trên màn hình desktop."
    >
      <div className="grid grid-cols-3 gap-2">
        {POSITION_OPTIONS.map(({ value, label }) => {
          const active = navPosition === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setNavPosition(value)}
              className={cn(
                'relative flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-colors',
                active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted',
              )}
            >
              <PositionPreview position={value} />
              <span className="truncate text-[12px] font-medium text-foreground">{label}</span>
              {active && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
