'use client';

import { ArrowLeft, Ban, Lock, MessageSquare, Pin, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import type { Conversation } from '../../types';
import { ToggleRow } from '../common/ToggleRow';
import { OptionRow } from '../common/OptionRow';

type GroupSettingsPanelProps = {
  conversation: Conversation;
  onBack: () => void;
  onClose: () => void;
};

type SectionProps = { title: string; children: React.ReactNode };

function Section({ title, children }: SectionProps) {
  return (
    <section className="px-3 pb-3 pt-2">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

/**
 * Cài đặt nhóm — chỉ OWNER / ADMIN / MODERATOR thấy được entry point.
 * Tất cả toggle hiện là skeleton UI (disabled + comingSoon) chờ BE bổ sung endpoint.
 */
export function GroupSettingsPanel({ conversation, onBack, onClose }: GroupSettingsPanelProps) {
  const isSecret = conversation.encryptionType === 'E2E';

  return (
    <aside className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 pb-3 pt-[18px]">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          title="Quay lại"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-sm font-bold">Cài đặt nhóm</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          title="Đóng"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Section title="Bảo mật">
          <ToggleRow
            icon={<Lock className="h-4 w-4" />}
            label="Chế độ bí mật"
            subtitle={
              isSecret
                ? 'Đang bật — tin nhắn mã hoá đầu cuối'
                : 'Mã hoá đầu cuối — tin nhắn không lưu trên server'
            }
            checked={isSecret}
            disabled
            comingSoon
          />
        </Section>

        <Section title="Quyền thành viên">
          <ToggleRow
            icon={<MessageSquare className="h-4 w-4" />}
            label="Cho phép thành viên gửi tin"
            checked
            disabled
            comingSoon
          />
          <ToggleRow
            icon={<Pin className="h-4 w-4" />}
            label="Cho phép thành viên ghim tin"
            checked
            disabled
            comingSoon
          />
          <ToggleRow
            icon={<UserCheck className="h-4 w-4" />}
            label="Chế độ phê duyệt thành viên"
            subtitle="Thành viên mới cần được duyệt trước khi tham gia"
            checked={false}
            disabled
            comingSoon
          />
        </Section>

        <Section title="Kiểm duyệt">
          <OptionRow
            icon={<Ban className="h-4 w-4" />}
            label="Quản lý danh sách chặn"
            onClick={undefined}
          />
        </Section>
      </div>
    </aside>
  );
}
