import { describe, expect, it } from 'vitest';
import { buildSourceRefFromAnalysis } from './message-analysis';

describe('buildSourceRefFromAnalysis', () => {
  it('nên map đúng conversationId/messageIds sang CreateSourceRefInput', () => {
    const result = buildSourceRefFromAnalysis({
      conversationId: 'conv-1',
      messageIds: ['m1', 'm2'],
    });

    expect(result).toEqual({
      type: 'CHAT_MESSAGE',
      conversationId: 'conv-1',
      messageIds: ['m1', 'm2'],
    });
  });
});
