import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@/lib/hooks/useIsMobile", () => ({
  useIsMobile: () => mocks.isMobile,
}));

import { MyStoreHeader } from "../MyStoreHeader";

describe("MyStoreHeader", () => {
  beforeEach(() => {
    mocks.isMobile = false;
  });

  it("renders full-bleed on mobile and as a floating card on desktop", () => {
    const { container } = render(
      <MyStoreHeader activeTab="notes" onTabChange={() => {}} />,
    );
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass("border-b");
    expect(header).toHaveClass(
      "md:rounded-2xl",
      "md:border",
      "md:shadow-subtle",
    );
    expect(header).not.toHaveClass("rounded-2xl", "shadow-subtle");
  });

  it('gọi onTabChange với "files" khi bấm tab File', () => {
    const onTabChange = vi.fn();
    render(<MyStoreHeader activeTab="notes" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole("button", { name: /File/i }));
    expect(onTabChange).toHaveBeenCalledWith("files");
  });

  // Desktop luôn hiện panel phải → tiêu đề là text thuần, không được thành nút.
  it("không biến tiêu đề thành nút trên desktop dù có onOpenInfo", () => {
    render(
      <MyStoreHeader
        activeTab="notes"
        onTabChange={() => {}}
        onOpenInfo={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Mở thông tin kho của tôi/i }),
    ).not.toBeInTheDocument();
  });

  it("mobile: bấm cụm tiêu đề gọi onOpenInfo", () => {
    mocks.isMobile = true;
    const onOpenInfo = vi.fn();
    render(
      <MyStoreHeader
        activeTab="notes"
        onTabChange={() => {}}
        onOpenInfo={onOpenInfo}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /Mở thông tin kho của tôi/i,
    });
    expect(trigger).toContainElement(screen.getByText("Kho của tôi"));

    fireEvent.click(trigger);
    expect(onOpenInfo).toHaveBeenCalledTimes(1);
  });

  // Chưa có conversation SELF → không có gì để mở, tiêu đề phải trơ lại.
  it("mobile: không có onOpenInfo thì tiêu đề không bấm được", () => {
    mocks.isMobile = true;
    render(<MyStoreHeader activeTab="notes" onTabChange={() => {}} />);
    expect(
      screen.queryByRole("button", { name: /Mở thông tin kho của tôi/i }),
    ).not.toBeInTheDocument();
  });
});
