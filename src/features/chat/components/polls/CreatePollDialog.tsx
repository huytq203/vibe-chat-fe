'use client';

import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export function CreatePollDialog({ open, onOpenChange, conversationId }: Props) {
  const qc = useQueryClient();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultiChoice, setIsMultiChoice] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowAddOptions, setAllowAddOptions] = useState(false);
  const [hideResultsBeforeVote, setHideResultsBeforeVote] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  // Reset form khi dialog mở lại (sync-during-render).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuestion('');
      setOptions(['', '']);
      setIsMultiChoice(false);
      setIsAnonymous(false);
      setAllowAddOptions(false);
      setHideResultsBeforeVote(false);
      setExpiresAt('');
    }
  }

  const mutation = useMutation({
    mutationFn: () =>
      chatApi.createPoll(conversationId, {
        question: question.trim(),
        options: options.map((o) => o.trim()).filter(Boolean),
        isMultiChoice,
        isAnonymous,
        allowAddOptions,
        hideResultsBeforeVote,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
    },
    onError: () => toast.error('Tạo bình chọn thất bại, thử lại sau'),
  });

  function updateOption(idx: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  }

  function addOption() {
    if (options.length < MAX_OPTIONS) setOptions((prev) => [...prev, '']);
  }

  function removeOption(idx: number) {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit =
    question.trim().length > 0 && validOptions.length >= MIN_OPTIONS && !mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="text-base font-bold">Tạo bình chọn</DialogTitle>
        <form onSubmit={handleSubmit}>
          {/* 2-column layout */}
          <div className="flex gap-5">
            {/* Left column: question + options */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {/* Question textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12.5px] font-medium text-foreground">
                    Câu hỏi <span className="text-danger">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">{question.length}/200</span>
                </div>
                <textarea
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-[13.5px] placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  rows={3}
                  maxLength={200}
                  placeholder="Đặt câu hỏi bình chọn"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Options list */}
              <div className="flex flex-col gap-2">
                <p className="text-[12.5px] font-medium text-muted-foreground">
                  Lựa chọn ({validOptions.length}/{MAX_OPTIONS})
                </p>
                <div className="flex flex-col gap-1.5">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder={`Lựa chọn ${idx + 1}`}
                        value={opt}
                        maxLength={200}
                        onChange={(e) => updateOption(idx, (e.target as HTMLInputElement).value)}
                        className="flex-1"
                      />
                      {options.length > MIN_OPTIONS && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeOption(idx)}
                          aria-label="Xoá lựa chọn"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addOption}
                  disabled={options.length >= MAX_OPTIONS}
                  className="h-7 gap-1.5 px-2 text-[12.5px] font-medium text-primary hover:text-primary disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm lựa chọn
                </Button>
              </div>
            </div>

            {/* Right column: settings panel */}
            <div className="flex w-[200px] shrink-0 flex-col gap-3 rounded-xl border border-border bg-muted/60 p-3.5">
              {/* Thời hạn bình chọn */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-foreground">
                  Thời hạn bình chọn
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="h-px bg-border" />

              {/* Thiết lập nâng cao */}
              <div className="flex flex-col gap-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Thiết lập nâng cao
                </p>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <Checkbox
                    checked={isMultiChoice}
                    onCheckedChange={(v) => setIsMultiChoice(Boolean(v))}
                  />
                  <span className="text-[12.5px] leading-tight">Cho phép chọn nhiều phương án</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <Checkbox
                    checked={allowAddOptions}
                    onCheckedChange={(v) => setAllowAddOptions(Boolean(v))}
                  />
                  <span className="text-[12.5px] leading-tight">Có thể thêm phương án</span>
                </label>
              </div>

              <div className="h-px bg-border" />

              {/* Bình chọn ẩn danh */}
              <div className="flex flex-col gap-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Bình chọn ẩn danh
                </p>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <Checkbox
                    checked={hideResultsBeforeVote}
                    onCheckedChange={(v) => setHideResultsBeforeVote(Boolean(v))}
                  />
                  <span className="text-[12.5px] leading-tight">Ẩn kết quả khi chưa bình chọn</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <Checkbox
                    checked={isAnonymous}
                    onCheckedChange={(v) => setIsAnonymous(Boolean(v))}
                  />
                  <span className="text-[12.5px] leading-tight">Ẩn người bình chọn</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-5 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={!canSubmit} isLoading={mutation.isPending}>
              Tạo bình chọn
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
