import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_REMEMBERED_SCOPES,
  selectActiveConversation,
  useAiActiveConversationStore,
} from './ai-active-conversation.store';

function activeOf(scope: string): string | null {
  return selectActiveConversation(scope)(useAiActiveConversationStore.getState());
}

describe('ai-active-conversation.store', () => {
  beforeEach(() => useAiActiveConversationStore.setState({ recent: [] }));

  it('trả null cho scope chưa có hội thoại', () => {
    expect(activeOf('tasks')).toBeNull();
  });

  it('ghi và đọc hội thoại theo scope, không lẫn scope khác', () => {
    const { setActive } = useAiActiveConversationStore.getState();
    setActive('ws-1:page-1', 'conv-a');
    setActive('ws-1:page-2', 'conv-b');

    expect(activeOf('ws-1:page-1')).toBe('conv-a');
    expect(activeOf('ws-1:page-2')).toBe('conv-b');
  });

  it('null xoá scope khỏi danh sách', () => {
    const { setActive } = useAiActiveConversationStore.getState();
    setActive('tasks', 'conv-a');
    setActive('tasks', null);

    expect(activeOf('tasks')).toBeNull();
    expect(useAiActiveConversationStore.getState().recent).toEqual([]);
  });

  it('chỉ giữ các scope dùng gần nhất', () => {
    const { setActive } = useAiActiveConversationStore.getState();
    for (let index = 0; index <= MAX_REMEMBERED_SCOPES; index += 1) {
      setActive(`scope-${index}`, `conv-${index}`);
    }

    expect(useAiActiveConversationStore.getState().recent).toHaveLength(MAX_REMEMBERED_SCOPES);
    expect(activeOf('scope-0')).toBeNull();
    expect(activeOf(`scope-${MAX_REMEMBERED_SCOPES}`)).toBe(`conv-${MAX_REMEMBERED_SCOPES}`);
  });

  it('ghi lại scope cũ đưa nó lên đầu, không bị đẩy ra trước', () => {
    const { setActive } = useAiActiveConversationStore.getState();
    setActive('scope-old', 'conv-old');
    for (let index = 1; index < MAX_REMEMBERED_SCOPES; index += 1) {
      setActive(`scope-${index}`, `conv-${index}`);
    }
    setActive('scope-old', 'conv-old-2');
    setActive('scope-new', 'conv-new');

    expect(activeOf('scope-old')).toBe('conv-old-2');
    expect(activeOf('scope-1')).toBeNull();
  });

  it('persist vào localStorage', () => {
    useAiActiveConversationStore.getState().setActive('chat', 'conv-chat');

    const raw = window.localStorage.getItem('halo-ai-active');
    expect(raw).toContain('conv-chat');
  });
});
