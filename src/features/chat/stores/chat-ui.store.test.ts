import { beforeEach, describe, expect, it } from 'vitest';
import { SIDEBAR_LIMIT_MAX, SIDEBAR_PAGE_STEP, useChatUIStore } from './chat-ui.store';

describe('chat-ui.store sidebarLimit', () => {
  beforeEach(() => useChatUIStore.setState({ sidebarLimit: SIDEBAR_PAGE_STEP }));

  it('nên tăng limit mỗi lần tải thêm và dừng ở trần', () => {
    useChatUIStore.getState().loadMoreConversations();
    expect(useChatUIStore.getState().sidebarLimit).toBe(SIDEBAR_PAGE_STEP * 2);
    for (let i = 0; i < 20; i++) useChatUIStore.getState().loadMoreConversations();
    expect(useChatUIStore.getState().sidebarLimit).toBe(SIDEBAR_LIMIT_MAX);
  });
});
