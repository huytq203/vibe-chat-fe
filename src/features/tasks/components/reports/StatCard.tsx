'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Text } from '@/components/ui/typography/Typography';
import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  label: string;
  value: string;
  /** Dòng phụ dưới số liệu; không truyền deltaTone → hiển thị màu muted */
  delta?: string;
  deltaTone?: 'up' | 'down';
  icon: ReactNode;
}

export function StatCard({ label, value, delta, deltaTone, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center justify-between">
          <Text size="sm" color="muted">{label}</Text>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        </div>
        <div className="text-3xl font-extrabold tracking-tight text-foreground">{value}</div>
        {delta && (
          <Text
            size="xs"
            weight="medium"
            className={cn(
              'mt-1',
              deltaTone === 'up' && 'text-success',
              deltaTone === 'down' && 'text-danger',
              !deltaTone && 'text-muted-foreground',
            )}
          >
            {delta}
          </Text>
        )}
      </CardContent>
    </Card>
  );
}
