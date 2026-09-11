import { Skeleton } from '@/components/ui/skeleton/Skeleton';

interface NoteEditorSkeletonProps {
  testId?: string;
}

export function NoteEditorSkeleton({ testId = 'note-editor-loading' }: NoteEditorSkeletonProps) {
  return (
    <div className="space-y-4" data-testid={testId}>
      <Skeleton rounded="sm" className="h-9 w-full" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} rounded="sm" className="h-6 w-full" />
      ))}
    </div>
  );
}
