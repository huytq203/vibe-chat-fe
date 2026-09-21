import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageSelectionStore } from './message-selection.store';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  useMessageSelectionStore.setState({ conversationId: null, selectedIds: new Set() });
});

describe('message-selection.store', () => {
  it('enter bật chế độ chọn với 1 tin nhắn ban đầu', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm1');
    const state = useMessageSelectionStore.getState();
    expect(state.conversationId).toBe('conv-1');
    expect(state.selectedIds).toEqual(new Set(['m1']));
  });

  it('toggle thêm tin nhắn mới vào danh sách đã chọn', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm1');
    useMessageSelectionStore.getState().toggle('m2');
    expect(useMessageSelectionStore.getState().selectedIds).toEqual(
      new Set(['m1', 'm2']),
    );
  });

  it('toggle bỏ tin nhắn đã chọn', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm1');
    useMessageSelectionStore.getState().toggle('m2');
    useMessageSelectionStore.getState().toggle('m1');
    expect(useMessageSelectionStore.getState().selectedIds).toEqual(new Set(['m2']));
  });

  it('bỏ chọn hết tin nhắn cuối cùng thì tự thoát chế độ chọn', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm1');
    useMessageSelectionStore.getState().toggle('m1');
    const state = useMessageSelectionStore.getState();
    expect(state.conversationId).toBeNull();
    expect(state.selectedIds.size).toBe(0);
  });

  it('exit tắt chế độ chọn và xoá hết danh sách', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm1');
    useMessageSelectionStore.getState().exit();
    const state = useMessageSelectionStore.getState();
    expect(state.conversationId).toBeNull();
    expect(state.selectedIds.size).toBe(0);
  });

  it('không thêm quá 50 tin nhắn', () => {
    useMessageSelectionStore.getState().enter('conv-1', 'm0');
    for (let i = 1; i < 50; i++) {
      useMessageSelectionStore.getState().toggle(`m${i}`);
    }
    expect(useMessageSelectionStore.getState().selectedIds.size).toBe(50);
    useMessageSelectionStore.getState().toggle('m-thu-51');
    expect(useMessageSelectionStore.getState().selectedIds.size).toBe(50);
    expect(
      useMessageSelectionStore.getState().selectedIds.has('m-thu-51'),
    ).toBe(false);
  });
});
