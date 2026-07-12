'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { useBots } from '../hooks/use-query';
import { BotRow } from './BotRow';
import { CreateBotDialog } from './CreateBotDialog';
import type { Bot } from '../types';

const PAGE_LIMIT = 20;

/** Tab "Bot của tôi" trong Settings — list bot + tạo bot + entry quản lý token. */
export function BotsTab() {
  const { data, isLoading, isError } = useBots({ page: 1, limit: PAGE_LIMIT });
  const [createOpen, setCreateOpen] = useState(false);
  // TODO(huy): Task 11 sẽ đổi lại thành `const [manageTokenBot, setManageTokenBot] = ...`
  // khi BotTokensPanel được thêm và đọc `manageTokenBot` — tạm bỏ biến khỏi destructure
  // để tránh lint no-unused-vars vì chưa có nơi dùng — 2026-07-12.
  const [, setManageTokenBot] = useState<Bot | null>(null);

  return (
    <SettingsSection
      title="Bot của tôi"
      desc="Tạo và quản lý bot của bạn — giống BotFather bên Telegram."
    >
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} data-testid="bot-skeleton" className="h-[60px] w-full" rounded="lg" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-[13px] text-muted-foreground">Không tải được danh sách bot.</p>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-[13px] text-muted-foreground">Bạn chưa có bot nào.</p>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Tạo bot mới
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {data.items.map((bot) => (
              <BotRow key={bot.id} bot={bot} onManageTokens={setManageTokenBot} />
            ))}
          </ul>
          <div className="mt-4">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              Tạo bot mới
            </Button>
          </div>
        </>
      )}

      <CreateBotDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* BotTokensPanel gắn ở Task 11 — render khi manageTokenBot != null */}
    </SettingsSection>
  );
}
