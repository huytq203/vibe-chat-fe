import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  route: { id: undefined as string | undefined },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useParams: () => ({ id: mocks.route.id }),
}));

import { useChatUIStore } from '@/features/chat/stores/chat-ui.store';
import { useSelectedConversation } from './useSelectedConversation';

describe('useSelectedConversation', () => {
  beforeEach(() => {
    mocks.replace.mockClear();
    mocks.route.id = 'conv-a';
    useChatUIStore.setState({
      pendingConversationId: undefined,
      pendingConversationRouteId: undefined,
    });
  });

  it('lấy id từ route khi không có lựa chọn đang chờ', () => {
    const { result } = renderHook(() => useSelectedConversation());
    expect(result.current.selectedConversationId).toBe('conv-a');
  });

  it('trả về null khi route không có id', () => {
    mocks.route.id = undefined;
    const { result } = renderHook(() => useSelectedConversation());
    expect(result.current.selectedConversationId).toBeNull();
  });

  // Bug gốc: mobile đổi panel ngay (zustand, đồng bộ) trong khi router.replace còn
  // đang bay → ChatPanel mount với id CŨ rồi mới nhảy sang id mới = nháy hội thoại.
  it('giữ id vừa chọn ngay cả khi route chưa commit', () => {
    const { result } = renderHook(() => useSelectedConversation());

    act(() => result.current.setSelected('conv-b'));

    expect(mocks.replace).toHaveBeenCalledWith('/chat/conv-b', { scroll: false });
    expect(result.current.selectedConversationId).toBe('conv-b');
    expect(useChatUIStore.getState().pendingConversationRouteId).toBe('conv-a');
  });

  it('bỏ chọn có hiệu lực ngay, không đợi route về /chat', () => {
    const { result } = renderHook(() => useSelectedConversation());

    act(() => result.current.setSelected(null));

    expect(mocks.replace).toHaveBeenCalledWith('/chat', { scroll: false });
    expect(result.current.selectedConversationId).toBeNull();
  });

  it('nhả optimistic id sau khi route commit, giá trị không đổi giữa chừng', () => {
    const { result, rerender } = renderHook(() => useSelectedConversation());

    act(() => result.current.setSelected('conv-b'));
    mocks.route.id = 'conv-b';
    rerender();

    expect(result.current.selectedConversationId).toBe('conv-b');
    expect(useChatUIStore.getState().pendingConversationId).toBeUndefined();
    expect(useChatUIStore.getState().pendingConversationRouteId).toBeUndefined();
  });

  // Điều hướng từ nguồn khác (click OS notification) commit trong lúc còn pending —
  // optimistic id phải nhường, nếu không UI kẹt ở conversation không còn được chọn.
  it('không kẹt khi route commit sang conversation khác', () => {
    const { result, rerender } = renderHook(() => useSelectedConversation());

    act(() => result.current.setSelected('conv-b'));
    mocks.route.id = 'conv-x';
    rerender();

    expect(result.current.selectedConversationId).toBe('conv-x');
    expect(useChatUIStore.getState().pendingConversationId).toBeUndefined();
  });
});
