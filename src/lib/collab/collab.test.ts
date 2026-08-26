import type { HocuspocusProviderConfiguration } from '@hocuspocus/provider';
import { describe, expect, it, vi } from 'vitest';

const {
  persistenceConstructor,
  persistenceDestroy,
  providerConstructor,
  providerDestroy,
} = vi.hoisted(() => ({
  persistenceConstructor: vi.fn<(name: string, doc: unknown) => void>(),
  persistenceDestroy: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  providerConstructor:
    vi.fn<(configuration: HocuspocusProviderConfiguration) => void>(),
  providerDestroy: vi.fn<() => void>(),
}));

vi.mock('@hocuspocus/provider', () => ({
  HocuspocusProvider: class {
    constructor(configuration: HocuspocusProviderConfiguration) {
      providerConstructor(configuration);
    }

    destroy(): void {
      providerDestroy();
    }
  },
}));

vi.mock('@/config/env', () => ({
  env: { NEXT_PUBLIC_NOTION_WS_URL: 'ws://collab.test:8081' },
}));

vi.mock('y-indexeddb', () => ({
  IndexeddbPersistence: class {
    readonly whenSynced = Promise.resolve();

    constructor(name: string, doc: unknown) {
      persistenceConstructor(name, doc);
    }

    destroy(): Promise<void> {
      return persistenceDestroy();
    }
  },
}));

import {
  COLLAB_FRAGMENT_NAME,
  YDoc,
  collabDocumentName,
  createCollabProvider,
  createCollabSession,
} from '@/lib/collab';

function latestProviderConfiguration(): HocuspocusProviderConfiguration {
  const configuration = providerConstructor.mock.calls.at(-1)?.[0];
  if (!configuration) throw new Error('Provider chưa được khởi tạo trong test');
  return configuration;
}

describe('hạ tầng cộng tác thời gian thực', () => {
  it('tạo đúng tên tài liệu từ pageId', () => {
    expect(collabDocumentName('abc')).toBe('page:abc');
  });

  it('giữ nguyên fragment prosemirror mà BlockNote và BE cùng đọc', () => {
    expect(COLLAB_FRAGMENT_NAME).toBe('prosemirror');
  });

  it('nối provider thẳng tới URL WebSocket, không qua notion-proxy', () => {
    createCollabProvider({
      pageId: 'abc',
      doc: new YDoc(),
      getToken: () => 'token-moi',
      onStatus: vi.fn(),
    });

    const configuration = latestProviderConfiguration();
    if (!('url' in configuration)) {
      throw new Error('Provider phải dùng URL WebSocket trực tiếp');
    }
    expect(configuration.url).toBe('ws://collab.test:8081');
    expect(configuration.url).not.toContain('notion-proxy');
    expect(configuration.name).toBe('page:abc');
  });

  it('truyền token bằng hàm async để lấy lại token khi reconnect', async () => {
    const getToken = vi.fn(() => 'token-moi');
    createCollabProvider({
      pageId: 'abc',
      doc: new YDoc(),
      getToken,
      onStatus: vi.fn(),
    });

    const token = latestProviderConfiguration().token;
    expect(typeof token).toBe('function');
    if (typeof token !== 'function') throw new Error('Token phải là một hàm');

    await expect(token()).resolves.toBe('token-moi');
    expect(getToken).toHaveBeenCalledOnce();
  });

  it('chuyển nguyên văn lý do xác thực thất bại từ provider', () => {
    const onAuthenticationFailed = vi.fn<(reason: string) => void>();
    createCollabProvider({
      pageId: 'abc',
      doc: new YDoc(),
      getToken: () => 'token-moi',
      onStatus: vi.fn(),
      onAuthenticationFailed,
    });

    const callback = latestProviderConfiguration().onAuthenticationFailed;
    if (!callback) throw new Error('Callback lỗi xác thực chưa được gắn trong test');
    callback({
      reason: 'No permission for this page',
    });

    expect(onAuthenticationFailed).toHaveBeenCalledWith('No permission for this page');
  });

  it('nạp persistence trước provider và huỷ provider, persistence, doc đúng thứ tự', async () => {
    const lifecycle: string[] = [];
    persistenceConstructor.mockImplementationOnce(() => {
      lifecycle.push('persistence:create');
    });
    providerConstructor.mockImplementationOnce(() => {
      lifecycle.push('provider:create');
    });
    providerDestroy.mockImplementationOnce(() => {
      lifecycle.push('provider:destroy');
    });
    persistenceDestroy.mockImplementationOnce(async () => {
      lifecycle.push('persistence:destroy');
    });
    const session = createCollabSession({
      pageId: 'abc',
      getToken: async () => 'token-moi',
      onProvider: vi.fn(),
      onStatus: vi.fn(),
      onLocalReady: vi.fn(),
      onServerSynced: vi.fn(),
      onAuthenticationFailed: vi.fn(),
      onError: vi.fn(),
    });
    vi.spyOn(session.doc, 'destroy').mockImplementationOnce(() => {
      lifecycle.push('doc:destroy');
    });

    await vi.waitFor(() => expect(lifecycle).toContain('provider:create'));
    expect(lifecycle.slice(0, 2)).toEqual(['persistence:create', 'provider:create']);

    session.destroy();

    expect(lifecycle.slice(2)).toEqual([
      'provider:destroy',
      'persistence:destroy',
      'doc:destroy',
    ]);
  });
});
