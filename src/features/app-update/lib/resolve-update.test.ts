import { describe, expect, it } from 'vitest';
import type { UpdateManifest } from '@/lib/version/update-manifest';
import { resolveUpdateState } from './resolve-update';

const WIN_URL = 'https://s3.example.com/Halo-Setup-0.3.0.exe';

function buildManifest(overrides?: Partial<UpdateManifest>): UpdateManifest {
  return {
    version: '0.3.0',
    buildId: 'halo-abc',
    desktop: {
      latestVersion: '0.3.0',
      minSupportedVersion: '0.2.0',
      releaseNotes: 'Sửa lỗi đăng nhập',
      downloads: { win32: WIN_URL },
    },
    ...overrides,
  };
}

describe('resolveUpdateState — web', () => {
  it('nên báo có bản mới khi version web đang deploy lớn hơn bản đang chạy', () => {
    const state = resolveUpdateState(buildManifest(), { currentVersion: '0.2.0', platform: null });

    expect(state).toEqual({ kind: 'web-available', version: '0.3.0' });
  });

  it('nên im lặng khi chỉ khác buildId mà cùng version', () => {
    const state = resolveUpdateState(buildManifest({ buildId: 'halo-xyz' }), {
      currentVersion: '0.3.0',
      platform: null,
    });

    expect(state.kind).toBe('none');
  });
});

describe('resolveUpdateState — desktop', () => {
  it('nên báo có bản mới kèm link tải đúng nền tảng', () => {
    const state = resolveUpdateState(buildManifest(), { currentVersion: '0.2.1', platform: 'win32' });

    expect(state).toEqual({
      kind: 'desktop-available',
      version: '0.3.0',
      downloadUrl: WIN_URL,
      releaseNotes: 'Sửa lỗi đăng nhập',
    });
  });

  it('nên bắt buộc cập nhật khi thấp hơn minSupportedVersion', () => {
    const state = resolveUpdateState(buildManifest(), { currentVersion: '0.1.1', platform: 'win32' });

    expect(state.kind).toBe('desktop-required');
  });

  it('nên bắt buộc cập nhật dù nền tảng chưa có link tải', () => {
    const state = resolveUpdateState(buildManifest(), { currentVersion: '0.1.1', platform: 'linux' });

    expect(state).toMatchObject({ kind: 'desktop-required', downloadUrl: null });
  });

  it('nên không nhắc khi bản mới chưa có bộ cài cho nền tảng này', () => {
    const state = resolveUpdateState(buildManifest(), { currentVersion: '0.2.1', platform: 'linux' });

    expect(state.kind).toBe('none');
  });

  it('nên không nhắc khi chưa cấu hình bản desktop', () => {
    const state = resolveUpdateState(buildManifest({ desktop: null }), {
      currentVersion: '0.1.0',
      platform: 'win32',
    });

    expect(state.kind).toBe('none');
  });

  it('nên bỏ qua version của bản web khi đang chạy desktop', () => {
    const manifest = buildManifest({ version: '9.9.9' });
    const state = resolveUpdateState(manifest, { currentVersion: '0.3.0', platform: 'win32' });

    expect(state.kind).toBe('none');
  });
});
