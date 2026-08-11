import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MyStoreInfoPanel } from "../MyStoreInfoPanel";

vi.mock("@/features/my-store/hooks/use-query", () => ({
  useStoreMessages: () => ({ data: undefined }),
}));
vi.mock("@/features/chat/components/contact/SharedTabs", () => ({
  SharedTabs: () => null,
}));
vi.mock("../QuotaBar", () => ({
  QuotaBar: () => null,
}));

describe("MyStoreInfoPanel", () => {
  // Mobile panel chiếm trọn khung nên phải full-bleed; card nổi chỉ từ md trở lên.
  it("renders full-bleed on mobile and as a rounded floating card on desktop", () => {
    render(<MyStoreInfoPanel conversationId="conv-1" onOpenFiles={() => {}} />);
    const aside = screen.getByRole("complementary");
    expect(aside).toHaveClass("md:rounded-2xl", "md:border", "md:shadow-subtle");
    expect(aside).not.toHaveClass("rounded-2xl", "shadow-subtle");
    expect(aside.className).not.toMatch(/\bborder-l\b/);
  });

  it("chỉ hiện nút đóng khi được truyền onClose", () => {
    const { rerender } = render(
      <MyStoreInfoPanel conversationId="conv-1" onOpenFiles={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Đóng" })).not.toBeInTheDocument();

    const onClose = vi.fn();
    rerender(
      <MyStoreInfoPanel
        conversationId="conv-1"
        onOpenFiles={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("vẫn hiển thị tiêu đề Kho của tôi", () => {
    render(<MyStoreInfoPanel conversationId="conv-1" onOpenFiles={() => {}} />);
    expect(screen.getByText("Kho của tôi")).toBeInTheDocument();
  });
});
