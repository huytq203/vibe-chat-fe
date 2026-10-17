// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateManifestSchema } from '@/lib/version/update-manifest';
import { GET } from './route';

async function readManifest(): Promise<unknown> {
  const response = GET();
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('access-control-allow-origin')).toBe('*');
  return response.json();
}

describe('GET /version.json', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('nên trả desktop = null khi chưa cấu hình bản desktop', async () => {
    const manifest = updateManifestSchema.parse(await readManifest());

    expect(manifest.desktop).toBeNull();
  });

  it('nên trả thông tin bản desktop và link tải theo nền tảng khi đã cấu hình', async () => {
    vi.stubEnv('DESKTOP_LATEST_VERSION', '0.2.0');
    vi.stubEnv('DESKTOP_MIN_VERSION', '0.2.0');
    vi.stubEnv('DESKTOP_DOWNLOAD_URL_WIN32', 'https://s3.example.com/Halo-Setup-0.2.0.exe');

    const manifest = updateManifestSchema.parse(await readManifest());

    expect(manifest.desktop).toEqual({
      latestVersion: '0.2.0',
      minSupportedVersion: '0.2.0',
      releaseNotes: null,
      downloads: { win32: 'https://s3.example.com/Halo-Setup-0.2.0.exe' },
    });
  });

  it('nên bỏ qua bản desktop khi env sai định dạng thay vì làm hỏng response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubEnv('DESKTOP_LATEST_VERSION', 'latest');

    const manifest = updateManifestSchema.parse(await readManifest());

    expect(manifest.desktop).toBeNull();
  });
});
