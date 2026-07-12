'use client';

import { useState, type ComponentType } from 'react';
import { Bell, Bot as BotIcon, Cloud, MessageSquare, MonitorSmartphone, Palette, ShieldCheck, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { cn } from '@/lib/utils/cn';
import { BotsTab } from '@/features/bots';
import { GeneralTab } from './tabs/GeneralTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { MessagesTab } from './tabs/MessagesTab';
import { PrivacyTab } from './tabs/PrivacyTab';
import { DevicesTab } from './tabs/DevicesTab';
import { BackupTab } from './tabs/BackupTab';

type TabId = 'general' | 'appearance' | 'notifications' | 'messages' | 'privacy' | 'devices' | 'backup' | 'bots';

type TabDef = { id: TabId; label: string; icon: LucideIcon; Component: ComponentType };

const TABS: readonly TabDef[] = [
  { id: 'general', label: 'Cài đặt chung', icon: SlidersHorizontal, Component: GeneralTab },
  { id: 'appearance', label: 'Giao diện', icon: Palette, Component: AppearanceTab },
  { id: 'notifications', label: 'Thông báo', icon: Bell, Component: NotificationsTab },
  { id: 'messages', label: 'Tin nhắn', icon: MessageSquare, Component: MessagesTab },
  { id: 'privacy', label: 'Quyền riêng tư & bảo mật', icon: ShieldCheck, Component: PrivacyTab },
  { id: 'devices', label: 'Thiết bị đăng nhập', icon: MonitorSmartphone, Component: DevicesTab },
  { id: 'bots', label: 'Bot của tôi', icon: BotIcon, Component: BotsTab },
  { id: 'backup', label: 'Backup', icon: Cloud, Component: BackupTab },
] as const;

export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [active, setActive] = useState<TabId>('appearance');
  const ActiveTab = TABS.find((t) => t.id === active)?.Component ?? AppearanceTab;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[760px] overflow-hidden p-0">
        <DialogTitle className="sr-only">Cài đặt</DialogTitle>
        <div className="flex h-[520px] max-h-[85vh]">
          <nav className="flex w-[56px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border bg-sidebar p-2 sm:w-[210px]">
            <div className="hidden px-2 pb-2 pt-1 text-sm font-bold text-foreground sm:block">Cài đặt</div>
            {TABS.map((tab) => {
              const isActive = tab.id === active;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(tab.id)}
                  title={tab.label}
                  aria-current={isActive}
                  className={cn(
                    'flex items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors sm:justify-start',
                    isActive
                      ? 'bg-primary/12 font-semibold text-primary'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="hidden truncate sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex-1 overflow-y-auto p-5">
            <ActiveTab />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
