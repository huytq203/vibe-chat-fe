'use client';

import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge/Badge';
import { Text } from '@/components/ui/typography/Typography';

/**
 * Khối placeholder cho các tính năng đã có bảng DB nhưng task-service CHƯA expose endpoint
 * (checklist, tags, comment, assignee, members…). Hiển thị mờ + nhãn "Sắp có" để trung thực
 * với người dùng thay vì giả lập dữ liệu không lưu được.
 */
export function ComingSoonRow({
  icon,
  label,
  className,
}: {
  icon: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 opacity-70',
        className,
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <Text size="sm" color="muted" className="flex-1">
        {label}
      </Text>
      <Badge variant="soft-primary" size="sm">
        Sắp có
      </Badge>
    </div>
  );
}

export function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" />
      </span>
      <Text weight="semibold">{title}</Text>
      <Text size="sm" color="muted" className="max-w-xs">
        {description}
      </Text>
      <Badge variant="soft-primary" size="sm" className="mt-1">
        Sắp có
      </Badge>
    </div>
  );
}
