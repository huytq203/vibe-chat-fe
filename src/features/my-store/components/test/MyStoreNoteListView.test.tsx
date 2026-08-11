import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyStoreNoteListView } from "../MyStoreNoteListView";

vi.mock("@/features/my-store/hooks/use-query", () => ({
  useStoreMessages: () => ({ data: undefined }),
}));
vi.mock("@/features/my-store/hooks/use-mutations", () => ({
  useDeleteStoreNote: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("MyStoreNoteListView", () => {
  it("renders full-bleed on mobile and as a rounded floating card on desktop", () => {
    render(
      <MyStoreNoteListView
        type="REMINDER"
        title="Nhắc nhở"
        emptyLabel="Chưa có nhắc nhở nào"
        onBack={() => {}}
      />,
    );
    const aside = screen.getByRole("complementary");
    expect(aside).toHaveClass("md:rounded-2xl", "md:border", "md:shadow-subtle");
    expect(aside).not.toHaveClass("rounded-2xl", "shadow-subtle");
    expect(aside.className).not.toMatch(/\bborder-l\b/);
  });

  it("vẫn hiển thị tiêu đề của loại ghi chú", () => {
    render(
      <MyStoreNoteListView
        type="REMINDER"
        title="Nhắc nhở"
        emptyLabel="Chưa có nhắc nhở nào"
        onBack={() => {}}
      />,
    );
    expect(screen.getByText("Nhắc nhở")).toBeInTheDocument();
  });
});
