'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { SETTINGS_TABS, type SettingsTabId } from './settings-tabs';

type Props = {
  onBack: () => void;
};

/** Mobile settings surface: a real full-height page, not a dialog/portal. */
export function SettingsPage({ onBack }: Props) {
  const [active, setActive] = useState<SettingsTabId>('appearance');
  const activeTab = SETTINGS_TABS.find((tab) => tab.id === active) ?? SETTINGS_TABS[0]!;
  const ActiveTab = activeTab.Component;

  return (
    <main className="flex h-full min-h-0 w-full flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại"
          title="Quay lại"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-foreground">Cài đặt</h1>
          <p className="truncate text-xs text-muted-foreground">{activeTab.label}</p>
        </div>
      </header>

      <nav
        aria-label="Danh mục cài đặt"
        className="flex shrink-0 gap-1 overflow-x-auto border-b px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SETTINGS_TABS.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-3xl">
          <ActiveTab onClose={onBack} />
        </div>
      </div>
    </main>
  );
}
