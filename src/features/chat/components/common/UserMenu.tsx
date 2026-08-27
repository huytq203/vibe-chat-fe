'use client';

import { useState } from 'react';
import { QrCode, Settings, User } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover/Popover';
import { useAuthStore } from '@/features/auth';
import { SettingsModal } from '@/features/settings';
import { ShareLinkDialog } from '@/features/share-links';
import { Avatar } from './Avatar';
import { ProfileDialog } from '@/features/chat/components/contact/ProfileDialog';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

interface UserMenuProps {
  variant?: 'default' | 'dock';
}

export function UserMenu({ variant = 'default' }: UserMenuProps) {
  const me = useAuthStore((s) => s.user);
  const isMobile = useIsMobile();
  const router = useRouter();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const isDock = variant === 'dock';

  const displayName = me?.displayName ?? me?.username ?? 'Tài khoản';

  const handleOpenProfile = () => {
    setPopoverOpen(false);
    setProfileOpen(true);
  };

  const handleOpenSettings = () => {
    setPopoverOpen(false);
    if (isMobile) router.push('/settings');
    else setSettingsOpen(true);
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger>
          <button
            type="button"
            title={displayName}
            aria-label="Tài khoản"
            className={cn(
              'outline-none transition-[color,background-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]',
              isDock
                ? 'flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                : 'rounded-lg focus-visible:ring-offset-2',
              isDock && popoverOpen && 'bg-primary/15 text-primary',
            )}
          >
            <Avatar
              name={me?.displayName ?? me?.username}
              src={me?.avatarUrl}
              size="sm"
              status="online"
              className={isDock ? 'h-7 w-7' : undefined}
            />
            {isDock && <span className="text-[10px] font-semibold leading-none">Tôi</span>}
          </button>
        </PopoverTrigger>

        <PopoverContent
          side={isDock ? 'top' : 'right'}
          align={isDock ? 'center' : 'end'}
          sideOffset={isDock ? 8 : 12}
          showArrow={false}
          className="w-64 p-0"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Avatar
              name={me?.displayName ?? me?.username}
              src={me?.avatarUrl}
              size="md"
              status="online"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{displayName}</div>
              <div className="truncate text-xs text-muted-foreground">
                {`@${me?.username ?? ''}`}
              </div>
            </div>
          </div>

          <div className="flex flex-col p-1.5">
            <button
              type="button"
              onClick={handleOpenProfile}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Thông tin tài khoản
            </button>
            <button
              type="button"
              onClick={() => { setPopoverOpen(false); setShareOpen(true); }}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <QrCode className="h-4 w-4 text-muted-foreground" />
              Chia sẻ hồ sơ
            </button>
            <button
              type="button"
              onClick={handleOpenSettings}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Cài đặt
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      <ShareLinkDialog open={shareOpen} onOpenChange={setShareOpen} />

      {!isMobile && <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </>
  );
}
