import type { ComponentType } from 'react';
import {
  Bell,
  Cloud,
  MessageSquare,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Sticker,
  type LucideIcon,
} from 'lucide-react';
import { GeneralTab } from './tabs/GeneralTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { MessagesTab } from './tabs/MessagesTab';
import { PrivacyTab } from './tabs/PrivacyTab';
import { DevicesTab } from './tabs/DevicesTab';
import { BackupTab } from './tabs/BackupTab';
import { StickersTab } from './tabs/StickersTab';

export type SettingsTabId =
  | 'general'
  | 'appearance'
  | 'notifications'
  | 'messages'
  | 'privacy'
  | 'devices'
  | 'backup'
  | 'stickers';

export type SettingsTabDefinition = {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
  Component: ComponentType<{ onClose?: () => void }>;
};

export const SETTINGS_TABS: readonly SettingsTabDefinition[] = [
  { id: 'general', label: 'Cài đặt chung', icon: SlidersHorizontal, Component: GeneralTab },
  { id: 'appearance', label: 'Giao diện', icon: Palette, Component: AppearanceTab },
  { id: 'notifications', label: 'Thông báo', icon: Bell, Component: NotificationsTab },
  { id: 'messages', label: 'Tin nhắn', icon: MessageSquare, Component: MessagesTab },
  { id: 'stickers', label: 'Sticker', icon: Sticker, Component: StickersTab },
  {
    id: 'privacy',
    label: 'Quyền riêng tư & bảo mật',
    icon: ShieldCheck,
    Component: PrivacyTab,
  },
  { id: 'devices', label: 'Thiết bị đăng nhập', icon: MonitorSmartphone, Component: DevicesTab },
  { id: 'backup', label: 'Backup', icon: Cloud, Component: BackupTab },
] as const;
