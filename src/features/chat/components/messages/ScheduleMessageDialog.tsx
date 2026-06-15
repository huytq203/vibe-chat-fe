'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Button } from '@/components/ui/button/Button';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useScheduleMessage } from '@/features/chat/hooks/use-scheduled-messages';
import { ScheduledMessageList } from './ScheduledMessageList';

const MAX_LENGTH = 5000;
// BE yêu cầu cách hiện tại ≥30s — FE đệm 60s cho an toàn lệch đồng hồ.
const MIN_LEAD_MS = 60 * 1000;

// Mốc mặc định khi mở dialog: giờ hiện tại + 1 tiếng, làm tròn phút (giây = 0).
// Seed sẵn 1 Date để TimePicker của DatePicker dùng được ngay (nó chỉ cho chỉnh
// giờ khi đã có 1 Date được chọn).
function defaultScheduleTime(): Date {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return d;
}

type ScheduleMessageDialogProps = {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Dialog hẹn giờ gửi tin: tab "Soạn" (nội dung + thời điểm) và tab "Đã hẹn" (quản lý). */
export function ScheduleMessageDialog({
  conversationId,
  open,
  onOpenChange,
}: ScheduleMessageDialogProps) {
  const [tab, setTab] = useState('compose');
  const [text, setText] = useState('');
  const [when, setWhen] = useState<Date | undefined>(defaultScheduleTime);
  const schedule = useScheduleMessage();

  // Seed lại state tươi mỗi lần dialog chuyển sang mở — dùng pattern "set-state khi
  // render" của React (theo dõi giá trị open trước đó), KHÔNG dùng effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setText('');
      setWhen(defaultScheduleTime());
      setTab('compose');
    }
  }

  const handleOpenChange = (next: boolean) => onOpenChange(next);

  const submit = () => {
    const content = text.trim();
    if (!content) {
      toast.error('Nhập nội dung tin nhắn');
      return;
    }
    if (!when) {
      toast.error('Chọn thời điểm gửi');
      return;
    }
    if (when.getTime() - Date.now() < MIN_LEAD_MS) {
      toast.error('Thời điểm gửi phải cách hiện tại ít nhất 1 phút');
      return;
    }
    schedule.mutate(
      {
        conversationId,
        scheduledAt: when.toISOString(),
        plaintext: content,
      },
      {
        onSuccess: () => {
          setText('');
          setWhen(defaultScheduleTime());
          setTab('scheduled');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Hẹn giờ gửi tin nhắn</DialogTitle>
        <DialogDescription>
          Soạn tin và chọn thời điểm — hệ thống sẽ tự gửi vào đúng giờ đã hẹn.
        </DialogDescription>

        <Tabs value={tab} onValueChange={(v) => setTab(v as string)} className="mt-2">
          <TabsList>
            <TabsTrigger value="compose">Soạn tin</TabsTrigger>
            <TabsTrigger value="scheduled">Đã hẹn</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="flex flex-col gap-4 pt-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập nội dung tin nhắn..."
              rows={4}
              maxLength={MAX_LENGTH}
              aria-label="Nội dung tin nhắn hẹn giờ"
            />
            <DatePicker
              mode="single"
              value={when}
              onChange={(d) => setWhen(d instanceof Date ? d : undefined)}
              showTime
              timeFormat="HH:mm"
              disablePastDates
              label="Thời điểm gửi"
              placeholder="Chọn ngày & giờ gửi"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                Đóng
              </Button>
              <Button
                variant="solid"
                onClick={submit}
                isLoading={schedule.isPending}
                disabled={!text.trim() || !when}
              >
                Hẹn giờ gửi
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="pt-4">
            <ScheduledMessageList conversationId={conversationId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
