import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NavSidebar } from "../NavSidebar";

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
    expect(nav).toHaveClass("md:rounded-2xl");
    expect(nav).toHaveClass("h-14", "w-full", "md:h-full", "md:w-14");
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

    fireEvent.click(screen.getByRole("button", { name: "Cài đặt" }));

    expect(onSectionChange).toHaveBeenCalledWith("settings");
    expect(screen.queryByRole("dialog", { name: "Cài đặt" })).not.toBeInTheDocument();
  });
});
