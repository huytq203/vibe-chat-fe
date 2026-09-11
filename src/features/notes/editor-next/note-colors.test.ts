import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { NOTE_COLORS } from "./note-colors";

describe("token màu ghi chú", () => {
  it("nên khai đủ 16 biến trong index.css cho cả hai theme", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles/index.css"), "utf8");
    const root = css.match(/:root \{([\s\S]*?)\n    \}/)?.[1] ?? "";
    const dark = css.match(/\.dark \{([\s\S]*?)\n    \}/)?.[1] ?? "";
    const variables = NOTE_COLORS.flatMap(({ key }) => [
      `--note-text-${key}:`,
      `--note-hl-${key}:`,
    ]);

    expect(variables).toHaveLength(16);
    variables.forEach((variable) => {
      expect(root).toContain(variable);
      expect(dark).toContain(variable);
    });
  });
});
