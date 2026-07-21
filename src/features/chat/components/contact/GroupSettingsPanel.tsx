'use client';

import { ArrowLeft, BadgeCheck, Ban, Forward, Globe, Link2, MessageSquare, Pencil, Pin, Shield, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { ToggleRow } from '@/features/chat/components/common/ToggleRow';
import { OptionRow } from '@/features/chat/components/common/OptionRow';
import type { Conversation, GroupSettings, PermissionScope } from '@/features/chat/types';
import { getMyRole, isAdminRole } from '@/features/chat/utils';
import { useUpdateConversation, useUpdateGroupSettings } from '@/features/chat/hooks/use-mutations';
import { GroupInfoEditor } from './GroupInfoEditor';

type GroupSettingsPanelProps = {
  conversation: Conversation;
  meId: string | null;
  onBack: () => void;
  onClose: () => void;
  /** Mở panel quản lý danh sách chặn (xem 28 §4). */
  onManageBanned: () => void;
  /** Mở panel quản lý quản trị viên (trưởng/phó nhóm). */
  onManageAdmins: () => void;
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

const DEFAULT_SETTINGS: GroupSettings = {
  joinByLink: true,
  joinApproval: false,
  whoCanEditInfo: 'ADMIN',
  whoCanSend: 'ALL',
  whoCanPin: 'ADMIN',
  protectContent: false,
  markLeaderMessages: true,
};

/**
 * Cài đặt nhóm (xem 28-group-settings.md). Entry point chỉ hiện cho quản trị viên.
 * Toggle quyền hạn chỉ OWNER/ADMIN/MODERATOR đổi được; sửa tên/mô tả theo whoCanEditInfo.
 */
export function GroupSettingsPanel({
  conversation, meId, onBack, onClose, onManageBanned, onManageAdmins,
}: GroupSettingsPanelProps) {
  const settings = conversation.settings ?? DEFAULT_SETTINGS;
  const myRole = getMyRole(conversation, meId);
  const isAdmin = isAdminRole(myRole);
  const canEditInfo = isAdmin || settings.whoCanEditInfo === 'ALL';

  const updateConvMut = useUpdateConversation();
  const settingsMut = useUpdateGroupSettings();
  const busy = settingsMut.isPending;

  // Đổi 1 cờ boolean trong settings.
  function setFlag(key: keyof GroupSettings, value: boolean) {
    settingsMut.mutate({ conversationId: conversation.id, settings: { [key]: value } });
  }
  // Đổi 1 phạm vi quyền: checked = cho phép cả thành viên (ALL).
  function setScope(key: 'whoCanSend' | 'whoCanPin' | 'whoCanEditInfo', allowAll: boolean) {
    const scope: PermissionScope = allowAll ? 'ALL' : 'ADMIN';
    settingsMut.mutate({ conversationId: conversation.id, settings: { [key]: scope } });
  }

  return (
    <aside className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 pb-3 pt-[18px]">
        <Button variant="ghost" size="icon-sm" onClick={onBack} title="Quay lại" aria-label="Quay lại">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-sm font-bold">Cài đặt nhóm</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} title="Đóng" aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Section title="Thông tin nhóm">
          <GroupInfoEditor conversation={conversation} canEditInfo={canEditInfo} />
        </Section>

        {isAdmin && (
          <>
            <Section title="Quyền riêng tư">
              <ToggleRow
                icon={<Globe className="h-4 w-4" />}
                label="Nhóm công khai"
                subtitle="Cho phép tìm thấy và xin vào nhóm"
                checked={conversation.isPublic === true}
                disabled={updateConvMut.isPending}
                onChange={(v) =>
                  updateConvMut.mutate({ conversationId: conversation.id, input: { isPublic: v } })
                }
              />
              <ToggleRow
                icon={<Forward className="h-4 w-4" />}
                label="Cấm chuyển tiếp"
                subtitle="Chặn nút chuyển tiếp; không ngăn copy thủ công hoặc chụp màn hình"
                checked={settings.protectContent}
                disabled={busy}
                onChange={(value) => setFlag('protectContent', value)}
              />
              <ToggleRow
                icon={<Link2 className="h-4 w-4" />}
                label="Cho vào nhóm qua link/QR"
                checked={settings.joinByLink}
                disabled={busy}
                onChange={(v) => setFlag('joinByLink', v)}
              />
              <ToggleRow
                icon={<UserCheck className="h-4 w-4" />}
                label="Phê duyệt thành viên vào qua link"
                subtitle="Vào qua link/QR phải được duyệt"
                checked={settings.joinApproval}
                disabled={busy || !settings.joinByLink}
                onChange={(v) => setFlag('joinApproval', v)}
              />
            </Section>

            <Section title="Quyền thành viên">
              <ToggleRow
                icon={<MessageSquare className="h-4 w-4" />}
                label="Cho phép thành viên gửi tin"
                subtitle="Tắt = chỉ quản trị viên được nhắn"
                checked={settings.whoCanSend === 'ALL'}
                disabled={busy}
                onChange={(v) => setScope('whoCanSend', v)}
              />
              <ToggleRow
                icon={<Pin className="h-4 w-4" />}
                label="Cho phép thành viên ghim tin"
                checked={settings.whoCanPin === 'ALL'}
                disabled={busy}
                onChange={(v) => setScope('whoCanPin', v)}
              />
              <ToggleRow
                icon={<Pencil className="h-4 w-4" />}
                label="Cho phép thành viên sửa thông tin nhóm"
                checked={settings.whoCanEditInfo === 'ALL'}
                disabled={busy}
                onChange={(v) => setScope('whoCanEditInfo', v)}
              />
            </Section>

            <Section title="Hiển thị">
              <ToggleRow
                icon={<BadgeCheck className="h-4 w-4" />}
                label="Đánh dấu tin của trưởng/phó nhóm"
                checked={settings.markLeaderMessages}
                disabled={busy}
                onChange={(v) => setFlag('markLeaderMessages', v)}
              />
            </Section>

            <Section title="Kiểm duyệt">
              <OptionRow
                icon={<Shield className="h-4 w-4" />}
                label="Quản lý quản trị viên"
                onClick={onManageAdmins}
              />
              <OptionRow
                icon={<Ban className="h-4 w-4" />}
                label="Quản lý danh sách chặn"
                onClick={onManageBanned}
              />
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}
