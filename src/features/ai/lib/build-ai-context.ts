import type { AiChatContext } from '@/services/ai.api';

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Ngữ cảnh tối thiểu BE bắt buộc cho mọi lượt chat (`today`, `timezone`) —
 * gửi `context: {}` sẽ bị 400 vì DTO yêu cầu hai trường này.
 */
export function buildAiContext(
  extra: Omit<AiChatContext, 'today' | 'timezone'> = {},
  now = new Date(),
): AiChatContext & Required<Pick<AiChatContext, 'today' | 'timezone'>> {
  const year = now.getFullYear();
  const month = padDatePart(now.getMonth() + 1);
  const day = padDatePart(now.getDate());

  return {
    today: `${year}-${month}-${day}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...extra,
  };
}
