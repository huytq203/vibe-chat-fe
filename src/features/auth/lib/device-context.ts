import { getDeviceName, getDeviceType, type DeviceType } from '@/lib/device/device-info';
import type { HandoffParams } from '@/features/auth/types';

export type DeviceContext = {
  deviceType: DeviceType;
  deviceName?: string;
  handoff?: HandoffParams;
};

/**
 * Trình duyệt mở từ app desktop không tạo phiên WEB: BE chỉ trả mã chuyển giao,
 * phiên DESKTOP (kèm tên máy) được tạo khi app đổi mã.
 */
export function buildDeviceContext(handoff: HandoffParams | null): DeviceContext {
  if (handoff) return { deviceType: 'DESKTOP', handoff };
  const deviceName = getDeviceName();
  return { deviceType: getDeviceType(), ...(deviceName ? { deviceName } : {}) };
}
