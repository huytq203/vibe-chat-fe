import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface MockSessionOptions {
  pageId: string;
  getToken: () => Promise<string | null>;
  onStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
  onLocalReady: () => void;
  onServerSynced: () => void;
  onStateless: (payload: string) => void;
  onAuthenticationFailed: (reason: string) => void;
}

const collabMock = vi.hoisted(() => {
  const events: string[] = [];
  const optionsByPage = new Map<string, MockSessionOptions>();
  const createProvider = vi.fn((pageId: string) => ({ pageId }));
  const destroyProvider = vi.fn((provider: { pageId: string }) => {
    events.push(`provider:destroy:${provider.pageId}`);
  });
  const createSession = vi.fn((options: MockSessionOptions) => {
    events.push(`doc:create:${options.pageId}`);
    optionsByPage.set(options.pageId, options);
    const provider = createProvider(options.pageId);
    return {
      doc: { pageId: options.pageId },
      provider,
      destroy: () => {
        destroyProvider(provider);
        events.push(`persistence:destroy:${options.pageId}`);
        events.push(`doc:destroy:${options.pageId}`);
      },
    };
  });
  return { createProvider, createSession, destroyProvider, events, optionsByPage };
});

const authMock = vi.hoisted(() => ({ getToken: vi.fn<() => string | null>() }));

vi.mock('@/lib/collab', () => ({
  createCollabSession: collabMock.createSession,
  createCollabProvider: collabMock.createProvider,
  destroyCollabProvider: collabMock.destroyProvider,
}));

vi.mock('@/lib/api/client', () => ({ apiAuth: { getToken: authMock.getToken } }));

import { useCollabDoc } from './useCollabDoc';

describe('hook tài liệu cộng tác', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collabMock.events.length = 0;
    collabMock.optionsByPage.clear();
    authMock.getToken.mockReturnValue(null);
  });

  afterEach(() => vi.restoreAllMocks());

  it('không tạo provider khi bị tắt hoặc chưa có pageId', () => {
    const first = renderHook(() => useCollabDoc('page-1', { enabled: false }));
    const second = renderHook(() => useCollabDoc(''));

    expect(first.result.current.doc).toBeNull();
    expect(second.result.current.doc).toBeNull();
    expect(collabMock.createProvider).not.toHaveBeenCalled();
  });

  it('huỷ provider khi unmount để không rò kết nối', () => {
    const { unmount } = renderHook(() => useCollabDoc('page-1'));

    unmount();

    expect(collabMock.destroyProvider).toHaveBeenCalledOnce();
    expect(collabMock.destroyProvider).toHaveBeenCalledWith({ pageId: 'page-1' });
  });

  it('huỷ doc cũ trước khi tạo doc cho pageId mới', () => {
    const { rerender } = renderHook(
      ({ pageId }: { pageId: string }) => useCollabDoc(pageId),
      { initialProps: { pageId: 'page-cu' } },
    );

    rerender({ pageId: 'page-moi' });

    const destroyed = collabMock.events.indexOf('doc:destroy:page-cu');
    const created = collabMock.events.indexOf('doc:create:page-moi');
    expect(destroyed).toBeGreaterThanOrEqual(0);
    expect(destroyed).toBeLessThan(created);
  });

  it('giữ nguyên thông điệp lỗi xác thực từ server', async () => {
    const { result } = renderHook(() => useCollabDoc('page-1'));
    const serverMessage = 'This page already has 50 people connected, please try again later';

    act(() => collabMock.optionsByPage.get('page-1')?.onAuthenticationFailed(serverMessage));

    await waitFor(() => expect(result.current.error).toBe(serverMessage));
  });

  it('trả trạng thái offline khi trình duyệt đang mất mạng', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    const { result } = renderHook(() => useCollabDoc('page-1'));

    expect(result.current.status).toBe('offline');
  });

  it('theo dõi cả sự kiện offline và online', async () => {
    let online = true;
    vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => online);
    const { result } = renderHook(() => useCollabDoc('page-1'));
    const sessionOptions = collabMock.optionsByPage.get('page-1');

    act(() => sessionOptions?.onStatus('connected'));
    online = false;
    act(() => window.dispatchEvent(new Event('offline')));
    await waitFor(() => expect(result.current.status).toBe('offline'));

    online = true;
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(result.current.status).toBe('connected'));
  });

  it('lấy token mới qua hàm async', async () => {
    authMock.getToken.mockReturnValueOnce('token-1').mockReturnValueOnce('token-2');
    renderHook(() => useCollabDoc('page-1'));
    const sessionOptions = collabMock.optionsByPage.get('page-1');
    if (!sessionOptions) throw new Error('Phiên cộng tác chưa được tạo trong test');

    await expect(sessionOptions.getToken()).resolves.toBe('token-1');
    await expect(sessionOptions.getToken()).resolves.toBe('token-2');

    expect(authMock.getToken).toHaveBeenCalledTimes(2);
  });

  it('không coi là đã đồng bộ khi mới chỉ nạp xong bản cục bộ', async () => {
    const { result } = renderHook(() => useCollabDoc('page-1'));
    const sessionOptions = collabMock.optionsByPage.get('page-1');
    if (!sessionOptions) throw new Error('Phiên cộng tác chưa được tạo trong test');

    act(() => sessionOptions.onLocalReady());

    await waitFor(() => expect(result.current.isLocalReady).toBe(true));
    expect(result.current.isSynced).toBe(false);
  });

  it('đánh dấu đã đồng bộ khi server báo synced', async () => {
    const { result } = renderHook(() => useCollabDoc('page-1'));
    const sessionOptions = collabMock.optionsByPage.get('page-1');
    if (!sessionOptions) throw new Error('Phiên cộng tác chưa được tạo trong test');

    act(() => sessionOptions.onLocalReady());
    await waitFor(() => expect(result.current.isLocalReady).toBe(true));

    act(() => sessionOptions.onServerSynced());

    await waitFor(() => expect(result.current.isSynced).toBe(true));
  });

  it('chuyển payload stateless lên callback tùy chọn', () => {
    const onStateless = vi.fn<(payload: string) => void>();
    renderHook(() => useCollabDoc('page-1', { onStateless }));
    const sessionOptions = collabMock.optionsByPage.get('page-1');
    if (!sessionOptions) throw new Error('Phiên cộng tác chưa được tạo trong test');

    act(() => sessionOptions.onStateless('payload-tu-server'));

    expect(onStateless).toHaveBeenCalledWith('payload-tu-server');
  });

  it('bỏ trạng thái đã đồng bộ khi kết nối bị rớt', async () => {
    const { result } = renderHook(() => useCollabDoc('page-1'));
    const sessionOptions = collabMock.optionsByPage.get('page-1');
    if (!sessionOptions) throw new Error('Phiên cộng tác chưa được tạo trong test');

    act(() => sessionOptions.onServerSynced());
    await waitFor(() => expect(result.current.isSynced).toBe(true));

    act(() => sessionOptions.onStatus('disconnected'));

    await waitFor(() => expect(result.current.isSynced).toBe(false));
  });
});
