import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getToken = vi.fn();
const register = vi.fn();
const getRegistrations = vi.fn();

vi.mock("@/config/env", () => ({
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "halo.example",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "halo",
    NEXT_PUBLIC_FIREBASE_SENDER_ID: "sender",
    NEXT_PUBLIC_FIREBASE_APP_ID: "app",
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: "vapid",
  },
  isFirebaseConfigured: () => true,
}));

vi.mock("firebase/app", () => ({
  getApp: vi.fn(),
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("firebase/messaging", () => ({
  getMessaging: vi.fn(() => ({})),
  getToken,
  isSupported: vi.fn(() => Promise.resolve(true)),
}));

const FCM_SCOPE = "/firebase-cloud-messaging-push-scope";

/** Scope phải tính theo origin thật của jsdom, nếu không mọi so khớp đều trượt. */
function scopeUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

function fakeRegistration(scriptPath: string, scopePath: string): ServiceWorkerRegistration {
  return {
    active: { scriptURL: scopeUrl(scriptPath) },
    scope: scopeUrl(scopePath),
  } as unknown as ServiceWorkerRegistration;
}

describe("Firebase messaging service worker", () => {
  beforeEach(() => {
    // messaging.ts cache app/messaging ở module scope → mỗi test cần bản mới.
    vi.resetModules();
    Object.defineProperty(window, "PushManager", { configurable: true, value: class {} });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "granted", requestPermission: vi.fn() },
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations, register },
    });
    getToken.mockResolvedValue("token");
  });

  afterEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(window, "PushManager");
    Reflect.deleteProperty(window, "Notification");
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("không nhầm PWA worker scope / với Firebase worker", async () => {
    const fcmRegistration = fakeRegistration("/firebase-messaging-sw.js", FCM_SCOPE);
    getRegistrations.mockResolvedValue([fakeRegistration("/sw.js?v=build-1", "/")]);
    register.mockResolvedValue(fcmRegistration);

    const { getFcmToken } = await import("./messaging");
    await expect(getFcmToken()).resolves.toBe("token");
    expect(register).toHaveBeenCalledWith(expect.stringContaining("/firebase-messaging-sw.js?"), {
      scope: FCM_SCOPE,
    });
    expect(getToken).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ serviceWorkerRegistration: fcmRegistration }),
    );
  });

  it("dùng lại registration Firebase đã có thay vì đăng ký lại", async () => {
    const fcmRegistration = fakeRegistration("/firebase-messaging-sw.js", FCM_SCOPE);
    getRegistrations.mockResolvedValue([fakeRegistration("/sw.js", "/"), fcmRegistration]);

    const { getFcmToken } = await import("./messaging");
    await expect(getFcmToken()).resolves.toBe("token");
    expect(register).not.toHaveBeenCalled();
    expect(getToken).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ serviceWorkerRegistration: fcmRegistration }),
    );
  });
});
