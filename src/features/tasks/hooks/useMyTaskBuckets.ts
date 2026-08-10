'use client';

import { useMemo } from 'react';
import { isToday, startOfDay } from 'date-fns';
import type { MyTask } from '../types';

export type MyTaskBucketId = 'overdue' | 'today' | 'upcoming' | 'someday';

export interface MyTaskBucket {
  id: MyTaskBucketId;
  label: string;
  tasks: MyTask[];
}

export interface MyTaskBuckets {
  buckets: MyTaskBucket[];
  overdueCount: number;
  todayCount: number;
}

const BUCKET_LABELS: Record<MyTaskBucketId, string> = {
  overdue: 'Quá hạn',
  today: 'Hôm nay',
  upcoming: 'Sắp tới',
  someday: 'Chưa đặt hạn',
};

const BUCKET_ORDER: MyTaskBucketId[] = ['overdue', 'today', 'upcoming', 'someday'];

function bucketOf(task: MyTask, todayStart: number): MyTaskBucketId {
  if (!task.dueDate) return 'someday';
  const due = new Date(task.dueDate);
  if (isToday(due)) return 'today';
  return due.getTime() < todayStart ? 'overdue' : 'upcoming';
}

/** Ghim lên trước, sau đó tới hạn sớm hơn lên trước; việc không hạn xếp cuối. */
function compare(a: MyTask, b: MyTask): number {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  if (!a.dueDate) return b.dueDate ? 1 : 0;
  if (!b.dueDate) return -1;
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

/** Chia việc được giao theo mức khẩn để trang chủ trả lời được "hôm nay làm gì". */
export function useMyTaskBuckets(tasks: MyTask[] | undefined): MyTaskBuckets {
  return useMemo(() => {
    const grouped: Record<MyTaskBucketId, MyTask[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      someday: [],
    };
    const todayStart = startOfDay(new Date()).getTime();

    for (const task of tasks ?? []) {
      grouped[bucketOf(task, todayStart)].push(task);
    }

    const buckets = BUCKET_ORDER.filter((id) => grouped[id].length > 0).map((id) => ({
      id,
      label: BUCKET_LABELS[id],
      tasks: grouped[id].sort(compare),
    }));

    return {
      buckets,
      overdueCount: grouped.overdue.length,
      todayCount: grouped.today.length,
    };
  }, [tasks]);
}
