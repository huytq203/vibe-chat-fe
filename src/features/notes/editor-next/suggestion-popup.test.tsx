import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SuggestionList } from "./suggestion-popup";
import { filterSlashItems } from "./slash-items";

describe("SuggestionList", () => {
  it("nên dùng token nền của dự án khi render", () => {
    const { container } = render(
      <SuggestionList
        items={[{ id: "paragraph", keywords: [], title: "Văn bản", run: vi.fn() }]}
        command={vi.fn()}
      />,
    );
    const popup = container.firstElementChild;

    expect(popup).toHaveClass("bg-popover");
    const forbiddenPrefix = ["^bg-", "tz", "-"].join("");
    expect(Array.from(popup?.classList ?? [])).not.toContainEqual(
      expect.stringMatching(new RegExp(forbiddenPrefix)),
    );
  });

  it("nên hiện nhóm khi không có query và hiện phẳng khi có query", () => {
    const command = vi.fn();
    const { rerender } = render(
      <SuggestionList items={filterSlashItems("")} command={command} />,
    );

    expect(screen.getByText("Cơ bản")).toBeInTheDocument();
    expect(screen.getByText("Chèn")).toBeInTheDocument();

    rerender(<SuggestionList items={filterSlashItems("h1")} command={command} />);

    expect(screen.queryByText("Cơ bản")).not.toBeInTheDocument();
  });
});
