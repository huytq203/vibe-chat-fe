import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavPosition, useSettingsStore } from '@/features/settings/stores/settings.store';
import { NavSidebar } from '../NavSidebar';
import {
  getMobileRadialOffset,
  getNearestMobileDockEdge,
} from '../nav/MobileFloatingNav';

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
    useSettingsStore.setState({ navPosition: NavPosition.LEFT });
  });

  afterEach(() => {
    vi.useRealTimers();
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
    render(<NavSidebar activeSection="tasks" onSectionChange={onSectionChange} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Mở menu điều hướng. Kéo để di chuyển" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cài đặt" }));

    expect(onSectionChange).toHaveBeenCalledWith("settings");
    expect(screen.queryByRole("dialog", { name: "Cài đặt" })).not.toBeInTheDocument();
  });

  it("opens mobile navigation as a radial menu with a close hub", () => {
    isMobile = true;
    render(<NavSidebar activeSection="tasks" onSectionChange={() => {}} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Mở menu điều hướng. Kéo để di chuyển" }),
    );

    expect(screen.getByRole("group", { name: "Các khu vực" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đóng menu điều hướng" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI Chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kho của tôi" })).toBeInTheDocument();
  });

  it('keeps the radial hub available in the mobile chat section', () => {
    isMobile = true;
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);

    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mở menu điều hướng. Kéo để di chuyển' }),
    ).toBeInTheDocument();
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

  it('moves the vertical nav to the end when positioned on the right', () => {
    useSettingsStore.setState({ navPosition: NavPosition.RIGHT });
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);

    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toHaveClass(
      'order-last',
    );
  });

  it('renders the fixed dock instead of the vertical nav when positioned at the bottom', () => {
    useSettingsStore.setState({ navPosition: NavPosition.BOTTOM });
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);

    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toHaveClass(
      'fixed',
      'inset-x-0',
      'bottom-0',
    );
    expect(screen.getByRole('toolbar', { name: 'Các khu vực' })).toBeInTheDocument();
  });

  it('reveals the bottom dock from its handle and hides it 400ms after pointer leave', () => {
    vi.useFakeTimers();
    useSettingsStore.setState({ navPosition: NavPosition.BOTTOM });
    render(<NavSidebar activeSection="chat" onSectionChange={() => {}} />);

    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    const dock = screen.getByRole('toolbar', { name: 'Các khu vực' }).parentElement;
    expect(dock).toHaveAttribute('data-visible', 'false');

    fireEvent.pointerEnter(screen.getByTestId('desktop-dock-handle'));
    expect(dock).toHaveAttribute('data-visible', 'true');

    fireEvent.pointerLeave(nav);
    act(() => vi.advanceTimersByTime(399));
    expect(dock).toHaveAttribute('data-visible', 'true');
    act(() => vi.advanceTimersByTime(1));
    expect(dock).toHaveAttribute('data-visible', 'false');
  });
});
