import type { DeviceType } from '@/lib/device/device-info';

/** 1 phiên đăng nhập đang hoạt động — khớp SessionResponseDto của auth backend. */
export type UserSessionInfo = {
  sessionId: string;
  deviceType: DeviceType;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  /** Có phải phiên/thiết bị đang dùng để gọi API này không. */
  current: boolean;
};
