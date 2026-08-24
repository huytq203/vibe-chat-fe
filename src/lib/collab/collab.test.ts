import type { HocuspocusProviderConfiguration } from '@hocuspocus/provider';
import { describe, expect, it, vi } from 'vitest';

const { providerConstructor, providerDestroy } = vi.hoisted(() => ({
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

import {
  COLLAB_FRAGMENT_NAME,
  YDoc,
  collabDocumentName,
  createCollabProvider,
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
});
