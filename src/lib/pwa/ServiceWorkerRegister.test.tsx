import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isElectron } from "@/lib/electron";
import { BANNER_DELAY_MS } from "./install-eligibility";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";

vi.mock("@/lib/electron", () => ({ isElectron: vi.fn(() => false) }));

const DESKTOP_UA = navigator.userAgent;
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function setUserAgent(value: string): void {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value });
}

/** Giả lập user đã quay lại app đủ nhiều để được mời cài. */
function seedReturningVisitor(): void {
  localStorage.setItem("halo.pwa.visit-count", "5");
}

function firePromptEvent(prompt = vi.fn().mockResolvedValue(undefined)): typeof prompt {
  fireEvent(
    window,
    Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    }),
  );
  return prompt;
}

function waitForBannerDelay(): void {
  act(() => {
    vi.advanceTimersByTime(BANNER_DELAY_MS);
  });
}

describe("ServiceWorkerRegister", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Store giữ sự kiện ở module scope — `appinstalled` là cách dọn đúng ngữ nghĩa.
    fireEvent(window, new Event("appinstalled"));
    setOnline(true);
    setUserAgent(DESKTOP_UA);
    localStorage.clear();
    vi.mocked(isElectron).mockReturnValue(false);
  });

  it("hiện trạng thái ngoại tuyến khi browser mất mạng", () => {
    setOnline(false);
    render(<ServiceWorkerRegister />);

    expect(screen.getByRole("status")).toHaveTextContent("Mất kết nối");
  });

  it("không mời cài ngay khi vừa tải trang", () => {
    seedReturningVisitor();
    render(<ServiceWorkerRegister />);
    firePromptEvent();

    expect(screen.queryByRole("button", { name: "Cài đặt" })).not.toBeInTheDocument();
  });

  it("không mời cài ở lần truy cập đầu tiên dù đã đủ thời gian", () => {
    render(<ServiceWorkerRegister />);
    firePromptEvent();
    waitForBannerDelay();

    expect(screen.queryByRole("button", { name: "Cài đặt" })).not.toBeInTheDocument();
  });

  it("mời cài sau khi user quay lại và ở lại đủ lâu", () => {
    seedReturningVisitor();

    render(<ServiceWorkerRegister />);
    const prompt = firePromptEvent();
    waitForBannerDelay();
    fireEvent.click(screen.getByRole("button", { name: "Cài đặt" }));

    expect(prompt).toHaveBeenCalledOnce();
  });

  it("không mời cài lại sau khi user đã đóng banner", () => {
    seedReturningVisitor();

    const { unmount } = render(<ServiceWorkerRegister />);
    firePromptEvent();
    waitForBannerDelay();
    fireEvent.click(screen.getByRole("button", { name: "Đóng lời mời cài đặt" }));
    unmount();

    render(<ServiceWorkerRegister />);
    waitForBannerDelay();

    expect(screen.queryByRole("button", { name: "Cài đặt" })).not.toBeInTheDocument();
  });

  it("hướng dẫn thủ công trên iOS vì không có beforeinstallprompt", () => {
    setUserAgent(IPHONE_UA);
    seedReturningVisitor();

    render(<ServiceWorkerRegister />);
    waitForBannerDelay();

    expect(screen.getByText(/Thêm vào MH chính/)).toBeInTheDocument();
  });

  it("không chạy UI PWA trong Electron", () => {
    vi.mocked(isElectron).mockReturnValue(true);
    setOnline(false);
    render(<ServiceWorkerRegister />);

    expect(screen.queryByText(/Mất kết nối/)).not.toBeInTheDocument();
  });
});
