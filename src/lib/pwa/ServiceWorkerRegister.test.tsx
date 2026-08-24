import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isElectron } from "@/lib/electron";
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

describe("ServiceWorkerRegister", () => {
  afterEach(() => {
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

  it("hiện nút cài đặt và gọi prompt của browser", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    const user = userEvent.setup();

    render(<ServiceWorkerRegister />);
    fireEvent(window, event);
    await user.click(screen.getByRole("button", { name: "Cài đặt" }));

    expect(prompt).toHaveBeenCalledOnce();
  });

  it("hướng dẫn thủ công trên iOS vì không có beforeinstallprompt", () => {
    setUserAgent(IPHONE_UA);
    render(<ServiceWorkerRegister />);

    expect(screen.getByText(/Thêm vào MH chính/)).toBeInTheDocument();
  });

  it("không hiện lại hướng dẫn iOS sau khi user đóng", async () => {
    setUserAgent(IPHONE_UA);
    const user = userEvent.setup();

    const { unmount } = render(<ServiceWorkerRegister />);
    await user.click(screen.getByRole("button", { name: "Đóng hướng dẫn cài đặt" }));
    unmount();
    render(<ServiceWorkerRegister />);

    expect(screen.queryByText(/Thêm vào MH chính/)).not.toBeInTheDocument();
  });

  it("không chạy UI PWA trong Electron", () => {
    vi.mocked(isElectron).mockReturnValue(true);
    setOnline(false);
    render(<ServiceWorkerRegister />);

    expect(screen.queryByText(/Mất kết nối/)).not.toBeInTheDocument();
  });
});
