'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { useBots } from '../hooks/use-query';
import { useOpenBotFatherChat } from '../hooks/use-mutations';
import { BotRow } from './BotRow';
import { BotTokensPanel } from './BotTokensPanel';
import type { Bot } from '../types';

const PAGE_LIMIT = 20;

/** Tab "Bot của tôi" trong Settings — list bot + entry chat với BotFather (tạo bot) + quản lý token. */
export function BotsTab({ onClose }: { onClose?: () => void } = {}) {
  const { data, isLoading, isError } = useBots({ page: 1, limit: PAGE_LIMIT });
  const [manageTokenBot, setManageTokenBot] = useState<Bot | null>(null);
  const openBotFatherChat = useOpenBotFatherChat();

  function handleChatWithBotFather() {
    openBotFatherChat.mutate(undefined, { onSuccess: () => onClose?.() });
  }

  return (
    <SettingsSection
      title="Bot của tôi"
      desc="Bot của bạn — tạo mới bằng cách chat với BotFather."
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
          <Button
            size="sm"
            leftIcon={<MessageCircle className="h-4 w-4" />}
            onClick={handleChatWithBotFather}
            isLoading={openBotFatherChat.isPending}
          >
            Chat với BotFather
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
            <Button
              size="sm"
              leftIcon={<MessageCircle className="h-4 w-4" />}
              onClick={handleChatWithBotFather}
              isLoading={openBotFatherChat.isPending}
            >
              Chat với BotFather
            </Button>
          </div>
        </>
      )}

      {manageTokenBot && (
        <BotTokensPanel
          bot={manageTokenBot}
          open
          onOpenChange={(next) => {
            if (!next) setManageTokenBot(null);
          }}
        />
      )}
    </SettingsSection>
  );
}
