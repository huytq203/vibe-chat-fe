import { describe, expect, it, vi } from 'vitest';
import { buildDeviceContext } from './device-context';

vi.mock('@/lib/device/device-info', () => ({
  getDeviceType: () => 'WEB',
  getDeviceName: () => 'Chrome trên Windows',
}));

describe('buildDeviceContext', () => {
  it('dùng loại/tên thiết bị hiện tại khi đăng nhập thường', () => {
    expect(buildDeviceContext(null)).toEqual({ deviceType: 'WEB', deviceName: 'Chrome trên Windows' });
  });

  it('khai báo DESKTOP kèm handoff khi trang được app desktop mở (phiên tạo ở bước đổi mã)', () => {
    const handoff = { state: 's'.repeat(16), codeChallenge: 'c'.repeat(43) };
    expect(buildDeviceContext(handoff)).toEqual({ deviceType: 'DESKTOP', handoff });
  });
});
