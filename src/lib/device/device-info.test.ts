import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isElectron } from '@/lib/electron';
import { getDeviceName, getDeviceType } from './device-info';

vi.mock('@/lib/electron', () => ({ isElectron: vi.fn() }));

const mockedIsElectron = vi.mocked(isElectron);

const CHROME_WINDOWS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('getDeviceType', () => {
  beforeEach(() => {
    mockedIsElectron.mockReset();
  });

  it('nên trả về WEB khi không chạy trong Electron', () => {
    mockedIsElectron.mockReturnValue(false);
    expect(getDeviceType()).toBe('WEB');
  });

  it('nên trả về DESKTOP khi chạy trong Electron', () => {
    mockedIsElectron.mockReturnValue(true);
    expect(getDeviceType()).toBe('DESKTOP');
  });
});

describe('getDeviceName', () => {
  beforeEach(() => {
    mockedIsElectron.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('nên chứa "Halo Desktop" khi chạy trong Electron', () => {
    mockedIsElectron.mockReturnValue(true);
    vi.stubGlobal('navigator', { userAgent: CHROME_WINDOWS_UA });
    expect(getDeviceName()).toContain('Halo Desktop');
  });

  it('nên parse "Chrome trên Windows" từ userAgent của trình duyệt', () => {
    mockedIsElectron.mockReturnValue(false);
    vi.stubGlobal('navigator', { userAgent: CHROME_WINDOWS_UA });
    expect(getDeviceName()).toBe('Chrome trên Windows');
  });
});
