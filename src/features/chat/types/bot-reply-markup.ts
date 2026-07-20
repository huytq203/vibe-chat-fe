import type { Message } from './message';

export type BotQuickReply = {
  text: string;
  value?: string;
  webApp?: BotWebAppButton;
};

export type BotWebAppButton = {
  url?: string;
  botUsername?: string;
  startParam?: string;
};

export type BotInlineKeyboardButton = {
  text: string;
  callbackData?: string;
  webApp?: BotWebAppButton;
};

export type BotInlineKeyboardRow = {
  buttons: BotInlineKeyboardButton[];
};

export type BotReplyMarkup = {
  quickReplies?: BotQuickReply[];
  inlineKeyboard?: BotInlineKeyboardRow[];
};

const QUICK_REPLY_MAX_ITEMS = 10;
const INLINE_KEYBOARD_MAX_ROWS = 8;
const INLINE_KEYBOARD_MAX_BUTTONS_PER_ROW = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readWebApp(raw: unknown): BotWebAppButton | undefined {
  if (!isRecord(raw)) return undefined;
  const url = typeof raw.url === 'string' ? raw.url.trim() : '';
  const botUsername =
    typeof raw.botUsername === 'string'
      ? raw.botUsername.trim()
      : typeof raw.bot_username === 'string'
        ? raw.bot_username.trim()
        : '';
  const startParam =
    typeof raw.startParam === 'string'
      ? raw.startParam.trim()
      : typeof raw.start_param === 'string'
        ? raw.start_param.trim()
        : '';
  if (!url && !botUsername && !startParam) return undefined;
  return {
    ...(url ? { url } : {}),
    ...(botUsername ? { botUsername } : {}),
    ...(startParam ? { startParam } : {}),
  };
}

function readQuickReplies(rawQuickReplies: unknown): BotQuickReply[] {
  if (!Array.isArray(rawQuickReplies)) return [];

  return rawQuickReplies
    .slice(0, QUICK_REPLY_MAX_ITEMS)
    .flatMap((item): BotQuickReply[] => {
      if (!isRecord(item) || typeof item.text !== 'string') return [];
      const text = item.text.trim();
      if (!text) return [];
      const value = typeof item.value === 'string' ? item.value.trim() : '';
      const webApp = readWebApp(item.webApp ?? item.web_app);
      return [{ text, ...(value ? { value } : {}), ...(webApp ? { webApp } : {}) }];
    });
}

function readInlineKeyboard(rawInlineKeyboard: unknown): BotInlineKeyboardRow[] {
  if (!Array.isArray(rawInlineKeyboard)) return [];

  return rawInlineKeyboard
    .slice(0, INLINE_KEYBOARD_MAX_ROWS)
    .flatMap((row): BotInlineKeyboardRow[] => {
      if (!isRecord(row) || !Array.isArray(row.buttons)) return [];

      const buttons = row.buttons
        .slice(0, INLINE_KEYBOARD_MAX_BUTTONS_PER_ROW)
        .flatMap((button): BotInlineKeyboardButton[] => {
          if (!isRecord(button) || typeof button.text !== 'string') return [];

          const text = button.text.trim();
          const callbackData =
            typeof button.callbackData === 'string'
              ? button.callbackData.trim()
              : typeof button.callback_data === 'string'
                ? button.callback_data.trim()
                : '';
          const webApp = readWebApp(button.webApp ?? button.web_app);
          if (!text || (!callbackData && !webApp)) return [];

          return [
            {
              text,
              ...(callbackData ? { callbackData } : {}),
              ...(webApp ? { webApp } : {}),
            },
          ];
        });

      return buttons.length > 0 ? [{ buttons }] : [];
    });
}

export function readBotReplyMarkup(message: Message): BotReplyMarkup | null {
  const metadata = message.metadata;
  if (!isRecord(metadata)) return null;

  const bot = metadata.bot;
  if (!isRecord(bot)) return null;

  const replyMarkup = bot.replyMarkup;
  if (!isRecord(replyMarkup)) return null;

  const quickReplies = readQuickReplies(replyMarkup.quickReplies);
  const inlineKeyboard = readInlineKeyboard(replyMarkup.inlineKeyboard);

  if (quickReplies.length === 0 && inlineKeyboard.length === 0) return null;

  return {
    ...(quickReplies.length > 0 ? { quickReplies } : {}),
    ...(inlineKeyboard.length > 0 ? { inlineKeyboard } : {}),
  };
}
