'use client';

import { useState } from 'react';
import { LogOut, QrCode, Settings, User } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover/Popover';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { useAuthStore, useLogout } from '@/features/auth';
import { SettingsModal } from '@/features/settings';
import { ShareLinkDialog } from '@/features/share-links';
import { Avatar } from './Avatar';
import { ProfileDialog } from '@/features/chat/components/contact/ProfileDialog';

export function UserMenu() {
  const me = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const displayName = me?.displayName ?? me?.username ?? 'Tài khoản';

  const handleOpenProfile = () => {
    setPopoverOpen(false);
    setProfileOpen(true);
  };

  const handleRequestLogout = () => {
    setPopoverOpen(false);
    setConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    setConfirmOpen(false);
    logout.mutate();
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen} >
        <PopoverTrigger>
          <button
            type="button"
            title={displayName}
            aria-label="Tài khoản"
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Avatar
              name={me?.displayName ?? me?.username}
              src={me?.avatarUrl}
              size="sm"
              status="online"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="right"
          align="end"
          sideOffset={12}
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
              onClick={() => { setPopoverOpen(false); setSettingsOpen(true); }}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Cài đặt
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={handleRequestLogout}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      <ShareLinkDialog open={shareOpen} onOpenChange={setShareOpen} />

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đăng xuất khỏi HaloChat?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng. Mọi phiên realtime sẽ
              bị đóng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={logout.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmLogout}
              isLoading={logout.isPending}
            >
              Đăng xuất
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
