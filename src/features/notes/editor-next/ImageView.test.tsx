import { render, screen, waitFor } from "@testing-library/react";
import type { NodeViewProps } from "@tiptap/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ImageView } from "./ImageView";

const resolveFileUrl = vi.hoisted(() => vi.fn());

vi.mock("@/features/notes/lib/resolve-file-url", () => ({
  resolveAttachmentFileUrl: resolveFileUrl,
}));

vi.mock("@tiptap/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tiptap/react")>();
  return {
    ...actual,
    NodeViewWrapper: ({ children, ...props }: { children: ReactNode; className?: string }) => (
      <div {...props}>{children}</div>
    ),
  };
});

function imageProps(src: string): NodeViewProps {
  return {
    node: { attrs: { alt: "Ảnh kiểm thử", src, title: null } },
  } as unknown as NodeViewProps;
}

describe("ImageView", () => {
  it("nên resolve attachment:// thành URL thật khi render ảnh", async () => {
    resolveFileUrl.mockResolvedValue("https://storage.local/ảnh.png");

    render(<ImageView {...imageProps("attachment://att-1")} />);

    expect(screen.getByRole("status", { name: "Đang tải ảnh Ảnh kiểm thử" }))
      .toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("img", { name: "Ảnh kiểm thử" }))
      .toHaveAttribute("src", "https://storage.local/ảnh.png"));
    expect(resolveFileUrl).toHaveBeenCalledWith("attachment://att-1");
  });
});
