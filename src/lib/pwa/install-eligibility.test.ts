import { afterEach, describe, expect, it } from 'vitest';
import {
  bumpVisitCount,
  isInstallDismissed,
  markInstallDismissed,
} from './install-eligibility';

describe('install-eligibility', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('mặc định chưa bị đóng', () => {
    expect(isInstallDismissed()).toBe(false);
  });

  it('nhớ lựa chọn đóng qua nhiều lần tải trang', () => {
    markInstallDismissed();

    expect(isInstallDismissed()).toBe(true);
  });

  it('tôn trọng key iOS cũ để người đã tắt không bị mời lại', () => {
    localStorage.setItem('halo.pwa.ios-hint-dismissed', '1');

    expect(isInstallDismissed()).toBe(true);
  });

  it('đếm luỹ kế số lần mở app', () => {
    expect(bumpVisitCount()).toBe(1);
    expect(bumpVisitCount()).toBe(2);
  });

  it('bỏ qua giá trị rác trong storage thay vì trả NaN', () => {
    localStorage.setItem('halo.pwa.visit-count', 'oops');

    expect(bumpVisitCount()).toBe(1);
  });
});
