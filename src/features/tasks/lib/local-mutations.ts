const LOCAL_MUTATION_TTL_MS = 3_000;

const localMutations = new Map<string, number>();

function mutationKey(taskId: string, kind: string): string {
  return `${taskId}:${kind}`;
}

/** Đánh dấu event tương ứng có thể quay lại từ socket của chính client này. */
export function markLocal(taskId: string, kind: string): void {
  localMutations.set(mutationKey(taskId, kind), Date.now() + LOCAL_MUTATION_TTL_MS);
}

/** Kiểm tra dấu local và dọn dấu đã hết TTL. */
export function isLocal(taskId: string, kind: string): boolean {
  const key = mutationKey(taskId, kind);
  const expiresAt = localMutations.get(key);
  if (expiresAt === undefined) return false;
  if (Date.now() <= expiresAt) return true;
  localMutations.delete(key);
  return false;
}
