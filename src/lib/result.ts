/**
 * Result type cho Server Actions — không leak raw error ra client.
 * Xem WORKFLOW.md §[DATA FETCHING & MUTATIONS].
 */
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E; fieldErrors?: Record<string, string[]> };

export const ok = <T>(data: T): Result<T, never> => ({ success: true, data });

export const fail = <E = string>(
  error: E,
  fieldErrors?: Record<string, string[]>,
): Result<never, E> => ({ success: false, error, fieldErrors });
