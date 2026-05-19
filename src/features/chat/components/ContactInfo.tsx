'use client';

import { useState } from 'react';
import { Bell, BellOff, Phone, Pin, Search, Trash2, UserX, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { useAuthStore } from '@/features/auth';
import { useChatUIStore } from '../stores/chat-ui.store';
import { useConversation, usePresence } from '../hooks/use-query';
import { getConversationName, getConversationSeed } from '../utils';
import { Avatar } from './Avatar';

export function ContactInfo() {
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const { selectedConversationId, setRightOpen } = useChatUIStore();
  const { data: conversation } = useConversation(selectedConversationId);
  const otherIds = conversation && conversation.type === 'DIRECT'
    ? conversation.memberIds.filter((id) => id !== meId)
    : [];
  const { data: presenceList } = usePresence(otherIds);
  const otherPresence = presenceList?.[0] ?? null;

  const [muted, setMuted] = useState(false);

  if (!conversation) return null;

  const name = getConversationName(conversation, meId);
  const seed = getConversationSeed(conversation, meId);
  const status = otherPresence?.isOnline ? 'online' : otherPresence ? 'offline' : null;
  const statusText = otherPresence?.isOnline
    ? 'Đang hoạt động'
    : otherPresence?.lastSeenLabel ?? (conversation.type === 'DIRECT' ? 'Ngoại tuyến' : `${conversation.memberCount} thành viên`);
  const statusVariant: 'soft-success' | 'soft-warning' | 'secondary' = otherPresence?.isOnline
    ? 'soft-success'
    : 'secondary';

  return (
    <aside className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[18px]">
        <span className="text-sm font-bold">Thông tin</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setRightOpen(false)}
          title="Đóng"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section className="flex flex-col items-center border-b border-border px-4 pb-4 pt-5">
          <Avatar name={name} seed={seed} size="lg" status={status} className="mb-3" />
          <div className="text-[17px] font-bold text-foreground">{name}</div>
          <Badge variant={statusVariant} size="sm" className="mt-1.5">
            {statusText}
          </Badge>
        </section>

        <section className="grid grid-cols-4 gap-2 px-3 py-3">
          <QuickAction icon={<Phone className="h-[18px] w-[18px]" />} label="Gọi" />
          <QuickAction icon={<Video className="h-[18px] w-[18px]" />} label="Video" />
          <QuickAction icon={<Search className="h-[18px] w-[18px]" />} label="Tìm" />
          <QuickAction
            icon={muted ? <BellOff className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
            label={muted ? 'Bỏ tắt' : 'Tắt t.báo'}
            active={muted}
            onClick={() => setMuted((m) => !m)}
          />
        </section>

        <section className="px-3 pt-2">
          <Tabs defaultValue="media">
            <TabsList size="xs" className="w-full">
              <TabsTrigger value="media" className="flex-1">Ảnh & Video</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">Tài liệu</TabsTrigger>
              <TabsTrigger value="links" className="flex-1">Liên kết</TabsTrigger>
            </TabsList>
            <TabsContent value="media" className="py-3 text-center text-[11.5px] text-muted-foreground">
              Chưa có ảnh hoặc video được chia sẻ
            </TabsContent>
            <TabsContent value="files" className="py-3 text-center text-[11.5px] text-muted-foreground">
              Chưa có tệp được chia sẻ
            </TabsContent>
            <TabsContent value="links" className="py-3 text-center text-[11.5px] text-muted-foreground">
              Chưa có liên kết được chia sẻ
            </TabsContent>
          </Tabs>
        </section>

        <section className="px-3 pb-4 pt-2">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tuỳ chọn
          </div>
          <div className="flex flex-col gap-0.5">
            <OptionRow icon={<Pin className="h-4 w-4" />} label="Ghim cuộc trò chuyện" />
            <OptionRow icon={<UserX className="h-4 w-4" />} label="Chặn người dùng" danger />
            <OptionRow icon={<Trash2 className="h-4 w-4" />} label="Xoá cuộc trò chuyện" danger />
          </div>
        </section>
      </div>
    </aside>
  );
}

function QuickAction({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Button
      variant={active ? 'danger-outline' : 'ghost'}
      onClick={onClick}
      className="flex h-auto flex-col items-center gap-1 rounded-xl bg-muted px-1 py-2.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
    >
      {icon}
      <span className="text-[10.5px] font-medium">{label}</span>
    </Button>
  );
}

function OptionRow({
  icon, label, danger, onClick,
}: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <Button
      variant={danger ? 'ghost' : 'ghost'}
      onClick={onClick}
      className={
        danger
          ? 'h-auto w-full justify-start gap-2 px-2 py-2 text-[13px] font-normal text-danger hover:bg-danger/10 hover:text-danger'
          : 'h-auto w-full justify-start gap-2 px-2 py-2 text-[13px] font-normal text-muted-foreground hover:text-foreground'
      }
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}
