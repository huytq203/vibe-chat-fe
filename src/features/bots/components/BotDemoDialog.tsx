'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog/Dialog';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { useSendBotDemoMessage } from '../hooks/use-mutations';
import {
  botDemoSendSchema,
  BOT_DEMO_COMMANDS,
  BOT_DEMO_COMMAND_LABELS,
  type BotDemoSendInput,
  type BotDemoCommand,
} from '../schemas';

export function BotDemoDialog({
  open,
  onOpenChange,
  conversationUuid: fixedConversationUuid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Đã biết trước conversation (vd mở từ panel chat với bot) — ẩn luôn ô nhập UUID. */
  conversationUuid?: string;
}) {
  const sendDemo = useSendBotDemoMessage();
  const [pendingCommand, setPendingCommand] = useState<BotDemoCommand | null>(null);

  const form = useForm<BotDemoSendInput>({
    resolver: zodResolver(botDemoSendSchema),
    defaultValues: { conversationUuid: fixedConversationUuid ?? '' },
  });

  async function handleCommand(command: BotDemoCommand) {
    let conversationUuid = fixedConversationUuid;
    if (!conversationUuid) {
      const valid = await form.trigger('conversationUuid');
      if (!valid) return;
      conversationUuid = form.getValues().conversationUuid;
    }
    setPendingCommand(command);
    sendDemo.mutate(
      { conversationUuid, command },
      {
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Gửi thất bại'),
        onSettled: () => setPendingCommand(null),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demo — bot gửi tin nhắn vui</DialogTitle>
          <DialogDescription>
            {fixedConversationUuid
              ? 'Chọn 1 trò để bot gửi thử vào cuộc trò chuyện này.'
              : 'Dán UUID cuộc trò chuyện (copy từ URL /chat/<uuid>) rồi chọn 1 trò để bot gửi thử vào đó.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            {!fixedConversationUuid && (
              <FormField
                control={form.control}
                name="conversationUuid"
                render={({ field, fieldState }) => (
                  <Input
                    label="Conversation UUID"
                    placeholder="00000000-0000-4000-8000-000000000000"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              {BOT_DEMO_COMMANDS.map((command) => (
                <Button
                  key={command}
                  type="button"
                  variant="outline"
                  isLoading={pendingCommand === command}
                  disabled={sendDemo.isPending && pendingCommand !== command}
                  onClick={() => handleCommand(command)}
                >
                  {BOT_DEMO_COMMAND_LABELS[command]}
                </Button>
              ))}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
