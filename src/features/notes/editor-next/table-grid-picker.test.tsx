import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TableGridPicker } from "./table-grid-picker";

describe("TableGridPicker", () => {
  it("nên dùng token chọn và viền của dự án khi render", () => {
    const { container } = render(<TableGridPicker onPick={vi.fn()} />);
    const selectedCell = screen.getByRole("button", { name: "1 cột × 1 hàng" });
    const idleCell = screen.getByRole("button", { name: "2 cột × 1 hàng" });

    expect(selectedCell).toHaveClass("bg-primary", "border-primary");
    expect(idleCell).toHaveClass("border-border");
    expect(Array.from(container.querySelectorAll("[class]"))).not.toContainEqual(
      expect.objectContaining({
        className: expect.stringMatching(new RegExp(["(?:^|\\s)bg-", "tz", "-"].join(""))),
      }),
    );
  });
});
