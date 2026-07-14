'use client';

import { useState } from 'react';
import { KeyRound, MoreVertical, Pencil, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { EditBotDialog } from './EditBotDialog';
import { DeleteBotAlertDialog } from './DeleteBotAlertDialog';
import { BotDemoDialog } from './BotDemoDialog';
import type { Bot } from '../types';

export function BotRow({
  bot,
  onManageTokens,
}: {
  bot: Bot;
  onManageTokens: (bot: Bot) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-foreground">{bot.username}</p>
          <Badge variant={bot.status === 'ACTIVE' ? 'soft-success' : 'soft-danger'} size="sm">
            {bot.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngưng'}
          </Badge>
          {!bot.provisioned && (
            <Badge variant="soft-warning" size="sm">
              Chưa provision
            </Badge>
          )}
        </div>
        <p className="truncate text-[12px] text-muted-foreground">{bot.displayName}</p>
      </div>

      <Button variant="ghost" size="sm" leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => onManageTokens(bot)}>
        Quản lý token
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn cho ${bot.displayName}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Sửa thông tin
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDemoOpen(true)}>
            <Sparkles className="h-4 w-4" />
            Demo gửi tin nhắn vui
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteBotAlertDialog bot={bot} />

      <EditBotDialog bot={bot} open={editOpen} onOpenChange={setEditOpen} />
      <BotDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </li>
  );
}
