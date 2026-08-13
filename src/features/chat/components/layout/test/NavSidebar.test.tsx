import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  getMobileRadialOffset,
  getNearestMobileDockEdge,
  NavSidebar,
} from "../NavSidebar";

let isMobile = false;

vi.mock("@/lib/hooks/useIsMobile", () => ({
  useIsMobile: () => isMobile,
}));

vi.mock("@/features/chat/hooks/useNavUnread", () => ({
  useNavUnread: () => ({ messageCount: 0, notifCount: 0, total: 0 }),
}));

vi.mock("@/features/tasks/hooks/useTaskActivityNotifications", () => ({
  useTaskActivityNotifications: () => ({ unreadCount: 0 }),
}));

describe("NavSidebar", () => {
  beforeEach(() => {
    isMobile = false;
  });
  it("renders as a rounded floating card without a border seam", () => {
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(nav).toHaveClass("rounded-2xl");
    expect(nav).toHaveClass("h-full", "w-14");
    expect(nav.className).not.toMatch(/\bborder-r\b/);
  });

  it("still renders all four nav items", () => {
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI Chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tasks" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Kho của tôi" }),
    ).toBeInTheDocument();
  });

  it("opens the complete settings modal from the sidebar", () => {
    render(<NavSidebar activeSection="tasks" onSectionChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Cài đặt" }));

    expect(screen.getByRole("dialog", { name: "Cài đặt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cài đặt chung" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Giao diện" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thông báo" })).toBeInTheDocument();
  });

  it("opens settings as a page section on mobile", () => {
    isMobile = true;
    const onSectionChange = vi.fn();
    render(<NavSidebar activeSection="chat" onSectionChange={onSectionChange} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Mở menu điều hướng. Kéo để di chuyển" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cài đặt" }));

    expect(onSectionChange).toHaveBeenCalledWith("settings");
    expect(screen.queryByRole("dialog", { name: "Cài đặt" })).not.toBeInTheDocument();
  });

  it("opens mobile navigation as a radial menu with a close hub", () => {
    isMobile = true;
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Mở menu điều hướng. Kéo để di chuyển" }),
    );

    expect(screen.getByRole("group", { name: "Các khu vực" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng menu điều hướng" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI Chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kho của tôi" })).toBeInTheDocument();
  });

  it("snaps a dragged mobile hub to its nearest screen edge", () => {
    expect(getNearestMobileDockEdge(4, 180, 320, 700)).toBe("left");
    expect(getNearestMobileDockEdge(190, 3, 320, 700)).toBe("top");
    expect(getNearestMobileDockEdge(316, 300, 320, 700)).toBe("right");
    expect(getNearestMobileDockEdge(160, 698, 320, 700)).toBe("bottom");
  });

  it("opens each edge arc toward the inside of the screen", () => {
    const leftMiddle = getMobileRadialOffset("left", 2, 5);
    const topMiddle = getMobileRadialOffset("top", 2, 5);
    const rightMiddle = getMobileRadialOffset("right", 2, 5);
    const bottomMiddle = getMobileRadialOffset("bottom", 2, 5);

    expect(leftMiddle.x).toBeGreaterThan(0);
    expect(topMiddle.y).toBeGreaterThan(0);
    expect(rightMiddle.x).toBeLessThan(0);
    expect(bottomMiddle.y).toBeLessThan(0);
  });
});
