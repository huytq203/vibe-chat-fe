import { diffWords } from 'diff';

export interface WordDiffChange {
  added?: boolean;
  removed?: boolean;
  value: string;
}

export function diffByWords(before: string, after: string): WordDiffChange[] {
  return diffWords(before, after);
}
