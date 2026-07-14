import { describe, expect, it } from 'vitest';
import { readBotReplyMarkup } from './bot-reply-markup';
import type { Message } from './message';

function buildMessage(metadata: Record<string, unknown> | null): Message {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'bot-1',
    type: 'TEXT',
    encryptionType: 'NONE',
    plaintext: 'Chọn một mục',
    attachments: [],
    contentPreview: 'Chọn một mục',
    metadata,
    replyToMessageId: null,
    isEdited: false,
    isDeleted: false,
    deletedFor: 'NONE',
    isView: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('readBotReplyMarkup', () => {
  it('nên đọc quick replies hợp lệ từ metadata bot', () => {
    const message = buildMessage({
      bot: {
        replyMarkup: {
          quickReplies: [
            { text: 'Có', value: '/yes' },
            { text: 'Không' },
          ],
        },
      },
    });

    expect(readBotReplyMarkup(message)).toEqual({
      quickReplies: [
        { text: 'Có', value: '/yes' },
        { text: 'Không' },
      ],
    });
  });

  it('nên đọc inline keyboard hợp lệ từ metadata bot', () => {
    const message = buildMessage({
      bot: {
        replyMarkup: {
          inlineKeyboard: [
            {
              buttons: [
                { text: 'Xác nhận', callbackData: 'confirm:1' },
                { text: 'Huỷ', callbackData: 'cancel:1' },
              ],
            },
          ],
        },
      },
    });

    expect(readBotReplyMarkup(message)).toEqual({
      inlineKeyboard: [
        {
          buttons: [
            { text: 'Xác nhận', callbackData: 'confirm:1' },
            { text: 'Huỷ', callbackData: 'cancel:1' },
          ],
        },
      ],
    });
  });

  it('nên đọc đồng thời quick replies và inline keyboard', () => {
    const message = buildMessage({
      bot: {
        replyMarkup: {
          quickReplies: [{ text: 'Xem hôm nay', value: '/weather today' }],
          inlineKeyboard: [
            { buttons: [{ text: 'Chi tiết', callbackData: 'details:today' }] },
          ],
        },
      },
    });

    expect(readBotReplyMarkup(message)).toEqual({
      quickReplies: [{ text: 'Xem hôm nay', value: '/weather today' }],
      inlineKeyboard: [
        { buttons: [{ text: 'Chi tiết', callbackData: 'details:today' }] },
      ],
    });
  });

  it('nên bỏ qua metadata không đúng shape', () => {
    expect(readBotReplyMarkup(buildMessage(null))).toBeNull();
    expect(readBotReplyMarkup(buildMessage({ bot: { replyMarkup: {} } }))).toBeNull();
    expect(
      readBotReplyMarkup(
        buildMessage({
          bot: { replyMarkup: { quickReplies: [{ value: '/missing-label' }] } },
        }),
      ),
    ).toBeNull();
  });

  it('nên giới hạn tối đa 10 quick replies', () => {
    const message = buildMessage({
      bot: {
        replyMarkup: {
          quickReplies: Array.from({ length: 12 }, (_, index) => ({
            text: `Gợi ý ${index + 1}`,
          })),
        },
      },
    });

    expect(readBotReplyMarkup(message)?.quickReplies).toHaveLength(10);
  });

  it('nên giới hạn inline keyboard tối đa 8 hàng và 4 nút mỗi hàng', () => {
    const message = buildMessage({
      bot: {
        replyMarkup: {
          inlineKeyboard: Array.from({ length: 10 }, (_, rowIndex) => ({
            buttons: Array.from({ length: 6 }, (_, buttonIndex) => ({
              text: `Nút ${rowIndex + 1}-${buttonIndex + 1}`,
              callbackData: `row:${rowIndex}:button:${buttonIndex}`,
            })),
          })),
        },
      },
    });

    const inlineKeyboard = readBotReplyMarkup(message)?.inlineKeyboard;
    expect(inlineKeyboard).toHaveLength(8);
    expect(inlineKeyboard?.[0]?.buttons).toHaveLength(4);
  });
});
