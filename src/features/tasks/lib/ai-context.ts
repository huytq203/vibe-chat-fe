import type { AiChatContext } from '@/services/ai.api';

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function buildTaskAiContext(
  projectId: string | null,
  now = new Date(),
): AiChatContext {
  const year = now.getFullYear();
  const month = padDatePart(now.getMonth() + 1);
  const day = padDatePart(now.getDate());

  return {
    today: `${year}-${month}-${day}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(projectId ? { projectId } : {}),
  };
}
