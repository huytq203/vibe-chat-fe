import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CollabAwarenessEntry, CollabProvider } from '@/lib/collab';

import { useAwareness } from './useAwareness';

const mocks = vi.hoisted(() => ({
  listener: null as ((entries: CollabAwarenessEntry[]) => void) | null,
  readAwareness: vi.fn<() => CollabAwarenessEntry[]>(),
  setLocalUser: vi.fn(),
  subscribe: vi.fn(),
}));

vi.mock('@/lib/collab', () => ({
  readCollabAwareness: mocks.readAwareness,
  setLocalCollabUser: mocks.setLocalUser,
  subscribeCollabAwareness: mocks.subscribe,
}));

vi.mock('@/features/auth', () => ({
  useAuthStore: (select: (state: {
    user: { id: string; displayName: string; username: string };
  }) => unknown) => select({
    user: { id: 'user-self', displayName: 'Người viết', username: 'nguoi-viet' },
  }),
}));

const provider = {} as CollabProvider;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listener = null;
  mocks.readAwareness.mockReturnValue([]);
  mocks.subscribe.mockImplementation((_provider, listener) => {
    mocks.listener = listener;
    return vi.fn();
  });
});

describe('awareness của trang ghi chú', () => {
  it('đặt danh tính và màu ổn định của chính mình vào awareness', async () => {
    renderHook(() => useAwareness(provider));

    await waitFor(() => expect(mocks.setLocalUser).toHaveBeenCalledWith(
      provider,
      expect.objectContaining({ id: 'user-self', name: 'Người viết' }),
    ));
    expect(mocks.setLocalUser.mock.calls[0][1].color).toMatch(/^#/);
  });

  it('cập nhật danh sách khi người xem khác tham gia', async () => {
    const { result } = renderHook(() => useAwareness(provider));
    const remoteEntry: CollabAwarenessEntry = {
      clientId: 2,
      isSelf: false,
      state: { user: { id: 'user-remote', name: 'Bạn cộng tác' } },
    };

    await waitFor(() => expect(mocks.listener).not.toBeNull());
    act(() => mocks.listener?.([remoteEntry]));

    expect(result.current).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 'user-remote', name: 'Bạn cộng tác', isSelf: false }),
    ]));
  });

  it('không render lại khi awareness chỉ đổi tín hiệu di chuyển con trỏ', async () => {
    const { result } = renderHook(() => useAwareness(provider));
    const remoteEntry: CollabAwarenessEntry = {
      clientId: 2,
      isSelf: false,
      state: { user: { id: 'user-remote', name: 'Bạn cộng tác' } },
    };

    await waitFor(() => expect(mocks.listener).not.toBeNull());
    act(() => mocks.listener?.([remoteEntry]));
    await waitFor(() => expect(result.current).toHaveLength(2));

    const peopleAfterJoin = result.current;

    // `cursorMovedAt` là thứ `onPointerUp` của editor ghi vào awareness mỗi lần nhả chuột.
    // Nếu nó kéo theo re-render thì cây editor dựng lại NGAY GIỮA mousedown và mouseup,
    // menu nổi của BlockNote đổi node nên trình duyệt không sinh `click` — bảng màu bấm
    // chuột không ăn còn bàn phím vẫn chạy. Đã đo thật trên trình duyệt trước khi sửa.
    act(() => mocks.listener?.([
      { ...remoteEntry, state: { ...remoteEntry.state, cursorMovedAt: Date.now() } },
    ]));

    // Giữ nguyên danh tính mảng ⇒ `setSnapshot` đã trả về đúng state cũ nên React
    // bail-out, không commit: DOM và cây con không dựng lại. (React vẫn có thể render
    // lại riêng hook này một lần để tính state mới — đó là hành vi bình thường, đếm số
    // lần render không phải phép đo đúng ở đây.)
    expect(result.current).toBe(peopleAfterJoin);
  });
});
