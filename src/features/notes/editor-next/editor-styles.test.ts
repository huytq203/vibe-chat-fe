import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles/index.css"), "utf8");
const extensions = readFileSync(resolve(process.cwd(), "src/features/notes/editor-next/extensions.ts"), "utf8");
const embedView = readFileSync(resolve(process.cwd(), "src/features/notes/editor-next/EmbedView.tsx"), "utf8");
const codeBlockView = readFileSync(
  resolve(process.cwd(), "src/features/notes/editor-next/CodeBlockView.tsx"),
  "utf8",
);

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  return match?.[1] ?? "";
}

describe("hình học editor ghi chú Tiptap", () => {
  it("nên đặt cột nội dung rộng 720px và canh giữa", () => {
    const styles = rule(".notes-editor-next");

    expect(styles).toContain("max-width: 45rem");
    expect(styles).toContain("margin-inline: auto");
  });

  it("nên đặt hai máng nút ở -52px và -28px", () => {
    const styles = rule(".notes-editor-next__gutter");

    expect(styles).toContain("--note-insert-lane: -52px");
    expect(styles).toContain("--note-drag-lane: -28px");
    expect(styles).toContain("width: 52px");
  });

  it("nên để nội dung gutter tự canh theo dòng chữ đầu", () => {
    expect(rule(".notes-editor-next__gutter")).not.toContain("padding-top");
    expect(rule(".notes-editor-next__gutter-content")).toContain("height: 24px");
  });

  it("nên hiện placeholder khi khối rỗng", () => {
    const styles = rule(
      '.notes-editor-next .ProseMirror p.is-editor-empty:first-child::before',
    );

    expect(styles).toContain("color: var(--muted-foreground)");
    expect(extensions).toContain('const DEFAULT_PLACEHOLDER = "Nhấn `/` để chèn khối"');
  });

  it("nên không dùng token ngoài hệ thiết kế khi tạo giao diện embed", () => {
    expect(`${css}\n${embedView}\n${codeBlockView}`).not.toMatch(new RegExp("\\bt" + "z-"));
    expect(`${embedView}\n${codeBlockView}`).not.toMatch(/#[\da-f]{3,8}\b/i);
  });
});
