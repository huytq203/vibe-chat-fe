import { diffByWords } from '@/lib/diff/words';

export type MarkdownDiffSegment = {
  type: 'added' | 'removed' | 'same';
  value: string;
};

export function createMarkdownDiff(
  before: string,
  after: string,
): MarkdownDiffSegment[] {
  return diffByWords(before, after).map((change) => ({
    type: change.added ? 'added' : change.removed ? 'removed' : 'same',
    value: change.value,
  }));
}
