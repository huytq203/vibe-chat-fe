'use client';

import { Bell, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';

interface AppHeaderProps {
  onCreateProject: () => void;
}

export function AppHeader({ onCreateProject }: AppHeaderProps) {
  return (
    <header className="flex h-[66px] shrink-0 items-center gap-4 border-b border-border bg-background px-7">
      <div className="flex-1" />

      <Input
        icon={<Search className="h-4 w-4" />}
        placeholder="Tìm nhiệm vụ, dự án…"
        className="hidden h-10 w-[280px] rounded-xl md:flex"
        aria-label="Tìm kiếm"
      />

      <button
        type="button"
        aria-label="Thông báo"
        className="relative grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground hover:bg-accent"
      >
        <Bell className="h-[18px] w-[18px]" />
      </button>

      <Button leftIcon={<Plus className="h-4 w-4" />} onClick={onCreateProject}>
        Tạo mới
      </Button>
    </header>
  );
}
