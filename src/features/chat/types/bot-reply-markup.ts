import type { Message } from './message';

export type BotQuickReply = {
  text: string;
  value?: string;
};

export type BotInlineKeyboardButton = {
  text: string;
  callbackData: string;
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

function readQuickReplies(rawQuickReplies: unknown): BotQuickReply[] {
  if (!Array.isArray(rawQuickReplies)) return [];

  return rawQuickReplies
    .slice(0, QUICK_REPLY_MAX_ITEMS)
    .flatMap((item): BotQuickReply[] => {
      if (!isRecord(item) || typeof item.text !== 'string') return [];
      const text = item.text.trim();
      if (!text) return [];
      const value = typeof item.value === 'string' ? item.value.trim() : '';
      return [{ text, ...(value ? { value } : {}) }];
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
          if (
            !isRecord(button) ||
            typeof button.text !== 'string' ||
            typeof button.callbackData !== 'string'
          ) {
            return [];
          }

          const text = button.text.trim();
          const callbackData = button.callbackData.trim();
          if (!text || !callbackData) return [];

          return [{ text, callbackData }];
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
